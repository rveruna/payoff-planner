import { useId } from 'react';
import { MAX_EXTRA } from '../domain/scenario';
import { formatPounds } from '../domain/money';

interface Props {
  value: number;
  onChange: (pence: number) => void;
}

export function ExtraPayment({ value, onChange }: Props) {
  const id = useId();
  return (
    <div className="card extra">
      <div className="field-row">
        <label htmlFor={id}>Extra to pay each month, on top of the minimums</label>
        <output htmlFor={id}>{formatPounds(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={MAX_EXTRA}
        step={1000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="note">Drag it and every result below updates at once.</p>
    </div>
  );
}
