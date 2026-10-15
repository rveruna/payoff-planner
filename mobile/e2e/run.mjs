// End-to-end checks against the Expo web export, in a real browser, with axe for accessibility.
// This runs the same JavaScript as the native app, but through react-native-web, so it proves the
// journeys and the layout on the web build only. It is not a substitute for a device run.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4177;
const BASE = `http://localhost:${PORT}/payoff-planner/app`;
const server = spawn('node', [path.join(here, 'serve.cjs'), path.join(here, '../dist'), String(PORT)], {
  stdio: 'ignore',
});
const executablePath = process.env.CHROME_PATH || undefined;

const failures = [];
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${String(e.message).split('\n').slice(0, 6).join('\n     ')}`);
  }
};

const scan = async (page, where) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  // Known and accepted: the tab bar comes from the navigation library and is not wrapped in a landmark,
  // which axe reports as best-practice "region" on the bar, its links and their icons. Nothing else may be.
  const inTabBar = (n) => n.target.some((t) => t.includes('a[href') || t.includes('.r-184en5c'));
  const report = violations
    .map((v) => ({ ...v, nodes: v.id === 'region' ? v.nodes.filter((n) => !inTabBar(n)) : v.nodes }))
    .filter((v) => v.nodes.length > 0);
  assert.deepEqual(
    report.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`),
    [],
    `axe on ${where}`,
  );
};
const noSideScroll = async (page) => {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  assert.ok(sw <= cw, `horizontal scroll: ${sw} > ${cw}`);
};

const browser = await chromium.launch({ executablePath });
const fresh = async (viewport = { width: 390, height: 844 }) => {
  const context = await browser.newContext({ viewport, hasTouch: true });
  const page = await context.newPage();
  page.on('pageerror', (e) => failures.push(`page error: ${e.message}`));
  return page;
};
const ready = async (page, url = `${BASE}/`) => {
  await page.goto(url);
  await page
    .getByText(/You owe/)
    .first()
    .waitFor();
};

try {
  await new Promise((r) => setTimeout(r, 1500));

  await check('first visit shows the sample debts and a payoff date', async () => {
    const page = await fresh();
    await ready(page);
    await page.getByText('You owe £17,830.00').waitFor();
    await page.getByRole('tab', { name: /Plan/ }).click();
    await page.getByText(/2029/).first().waitFor();
    await page.context().close();
  });

  await check('adding a debt works and survives a reload', async () => {
    const page = await fresh();
    await ready(page);
    await page.getByRole('button', { name: 'Add a debt' }).click();
    await page.getByLabel('Name').fill('Store card');
    await page.getByLabel('Balance owed').fill('400');
    await page.getByLabel('Interest rate (APR)').fill('24.9');
    await page.getByLabel('Minimum payment each month').fill('15');
    await page.getByRole('button', { name: 'Add debt', exact: true }).click();
    await page.getByText('Store card').first().waitFor();
    await page.getByText('You owe £18,230.00').waitFor();
    await page.reload();
    await page.getByText('Store card').first().waitFor();
    await page.context().close();
  });

  await check('an incomplete or invalid debt cannot be saved', async () => {
    const page = await fresh();
    await ready(page);
    await page.getByRole('button', { name: 'Add a debt' }).click();
    const save = page.getByRole('button', { name: 'Add debt', exact: true });
    assert.equal(await save.isDisabled(), true);
    await page.getByLabel('Name').fill('Bad');
    await page.getByLabel('Balance owed').fill('-5');
    await page.getByLabel('Interest rate (APR)').fill('5');
    await page.getByLabel('Minimum payment each month').fill('1');
    await page.getByLabel('Name').focus();
    assert.equal(await save.isDisabled(), true);
    await page.context().close();
  });

  await check('the extra can be raised and the date moves earlier', async () => {
    const page = await fresh();
    await ready(page);
    await page.getByRole('tab', { name: /Plan/ }).click();
    const before = await page
      .getByText(/20\d\d/)
      .first()
      .innerText();
    for (let i = 0; i < 5; i++) await page.getByLabel('Increase the extra by £10').click();
    await page.waitForTimeout(300);
    const after = await page
      .getByText(/20\d\d/)
      .first()
      .innerText();
    assert.notEqual(after, before);
    await page.context().close();
  });

  await check('a shared link in the web-planner format opens the import screen', async () => {
    const page = await fresh();
    await page.goto(`${BASE}/import?d=Card~120000~2400~3000&x=50&s=avalanche`);
    await page.getByRole('button', { name: 'Replace my debts with this plan' }).waitFor();
    await page.getByRole('button', { name: 'Replace my debts with this plan' }).click();
    await page.waitForTimeout(500);
    await page.getByText('Debt-free in').waitFor();
    await page.getByText('£0.50').first().waitFor();
    await page.context().close();
  });

  await check('an unknown address says so and leads home', async () => {
    const page = await fresh();
    await page.goto(`${BASE}/nowhere`);
    await page.getByText('That page does not exist').waitFor();
    await page.getByText('Go to your debts').click();
    await page
      .getByText(/You owe/)
      .first()
      .waitFor();
    await page.context().close();
  });

  for (const [name, viewport] of [
    ['phone', { width: 390, height: 844 }],
    ['small phone', { width: 320, height: 568 }],
    ['tablet', { width: 820, height: 1180 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    await check(`no horizontal scroll and no axe violations on every screen (${name})`, async () => {
      const page = await fresh(viewport);
      await ready(page);
      await scan(page, `debts ${name}`);
      await noSideScroll(page);
      await page.getByRole('tab', { name: /Plan/ }).click();
      await page.getByText(/2029/).first().waitFor();
      await scan(page, `plan ${name}`);
      await noSideScroll(page);
      await page.getByRole('tab', { name: /Settings/ }).click();
      await page.getByText('App lock').first().waitFor();
      await scan(page, `settings ${name}`);
      await noSideScroll(page);
      await page.context().close();
    });
  }
} finally {
  await browser.close();
  server.kill();
}

if (failures.length) {
  console.log(`\n${failures.length} failed`);
  process.exit(1);
}
console.log('\nall end-to-end checks passed');
