import { monthOf, type Month } from '@domain/months';

/** The month it is now. A function of its own so that tests can say what month it is. */
export const currentMonth = (): Month => monthOf(new Date());
