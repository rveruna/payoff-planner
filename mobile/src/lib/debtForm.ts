import { z } from 'zod';
import { formatPercent, formatPounds, parsePercent, parsePounds } from '@domain/money';
import { MAX_NAME } from '@domain/scenario';
import type { Debt } from '@domain/types';
import type { NewDebt } from '@/store/scenarioStore';

/** What the form holds while it is being filled in: text, exactly as typed. */
export const debtFormSchema = z.object({
  name: z.string().max(MAX_NAME, `Use ${MAX_NAME} characters or fewer`),
  balance: z.string().refine((v) => {
    const pence = parsePounds(v);
    return pence !== null && pence > 0;
  }, 'Enter an amount above £0, such as 1,250.50'),
  apr: z.string().refine((v) => parsePercent(v) !== null, 'Enter a rate from 0 to 99.99, such as 24.9'),
  minimum: z.string().refine((v) => parsePounds(v) !== null, 'Enter an amount such as 75'),
});

export type DebtFormValues = z.infer<typeof debtFormSchema>;

const amount = (pence: number) => formatPounds(pence).replace('£', '');

export const EMPTY_FORM: DebtFormValues = { name: '', balance: '', apr: '', minimum: '' };

/** The form's starting text for a debt, or empty for a new one. */
export function toFormValues(debt?: Debt): DebtFormValues {
  if (!debt) return EMPTY_FORM;
  return {
    name: debt.name,
    balance: amount(debt.balance),
    apr: formatPercent(debt.aprBp).replace('%', ''),
    minimum: amount(debt.minPayment),
  };
}

/** Turns valid form text into a debt. Only call this with values the schema has accepted. */
export function toNewDebt(values: DebtFormValues): NewDebt {
  return {
    name: values.name.trim(),
    balance: parsePounds(values.balance)!,
    aprBp: parsePercent(values.apr)!,
    minPayment: parsePounds(values.minimum)!,
  };
}
