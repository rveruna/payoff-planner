import { monthOf } from '@domain/months';

// the setup replaces this module so other tests can say what month it is; here the real one is checked
const { currentMonth } = jest.requireActual<typeof import('./today')>('./today');

it('is the month it is now', () => {
  expect(currentMonth()).toBe(monthOf(new Date()));
});
