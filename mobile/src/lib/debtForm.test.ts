import { MAX_NAME } from '@domain/scenario';
import { debtFormSchema, EMPTY_FORM, toFormValues, toNewDebt } from './debtForm';

const valid = { name: 'Card', balance: '1,250.50', apr: '24.9', minimum: '75' };
const errors = (values: Partial<typeof valid>) =>
  debtFormSchema.safeParse({ ...valid, ...values }).error?.issues.map((i) => [i.path[0], i.message]) ?? [];

describe('debtFormSchema', () => {
  it('accepts a complete debt', () => {
    expect(debtFormSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts no name, and a rate of nothing', () => {
    expect(debtFormSchema.safeParse({ ...valid, name: '', apr: '0' }).success).toBe(true);
  });

  it.each([
    ['0', false],
    ['0.00', false],
    ['0.01', true],
    ['£1,000', true],
    ['10000000', true],
    ['10000000.01', false],
    ['abc', false],
    ['', false],
    ['1.234', false],
    ['-1', false],
  ])('the balance %j is valid: %s', (balance, ok) => {
    expect(errors({ balance }).some(([field]) => field === 'balance')).toBe(!ok);
  });

  it.each([
    ['0', true],
    ['99.99', true],
    ['24.9%', true],
    ['100', false],
    ['x', false],
    ['', false],
  ])('the rate %j is valid: %s', (apr, ok) => {
    expect(errors({ apr }).some(([field]) => field === 'apr')).toBe(!ok);
  });

  it.each([
    ['0', true],
    ['75', true],
    ['-5', false],
    ['1e3', false],
    ['', false],
  ])('the minimum %j is valid: %s', (minimum, ok) => {
    expect(errors({ minimum }).some(([field]) => field === 'minimum')).toBe(!ok);
  });

  it('allows a name up to the limit and no further', () => {
    expect(errors({ name: 'x'.repeat(MAX_NAME) })).toEqual([]);
    expect(errors({ name: 'x'.repeat(MAX_NAME + 1) })).toEqual([
      ['name', `Use ${MAX_NAME} characters or fewer`],
    ]);
  });

  it('reports every field that is wrong at once', () => {
    expect(errors({ balance: 'x', apr: 'x', minimum: 'x' }).map(([field]) => field)).toEqual([
      'balance',
      'apr',
      'minimum',
    ]);
  });
});

describe('toNewDebt', () => {
  it('turns the text into whole pence and basis points, and trims the name', () => {
    expect(toNewDebt({ ...valid, name: '  Card  ' })).toEqual({
      name: 'Card',
      balance: 125_050,
      aprBp: 2490,
      minPayment: 7_500,
    });
  });
});

describe('toFormValues', () => {
  it('is empty for a new debt', () => {
    expect(toFormValues()).toEqual(EMPTY_FORM);
  });

  it('writes a debt’s money as plain amounts and its rate without a percent sign', () => {
    expect(toFormValues({ id: 'x', name: 'Card', balance: 125_050, aprBp: 2490, minPayment: 7_500 })).toEqual(
      {
        name: 'Card',
        balance: '1,250.50',
        apr: '24.9',
        minimum: '75.00',
      },
    );
  });

  it('round-trips with toNewDebt for a range of debts', () => {
    for (const balance of [1, 99, 100, 123_456, 1_000_000_000]) {
      for (const aprBp of [0, 1, 1999, 9999]) {
        const debt = { id: 'x', name: 'N', balance, aprBp, minPayment: 5 };
        expect(toNewDebt(toFormValues(debt))).toEqual({ name: 'N', balance, aprBp, minPayment: 5 });
      }
    }
  });
});
