import { useId, useState } from 'react';

interface Props {
  label: string;
  value: number;
  /** Turns what was typed into a value, or null if it is not valid. */
  parse: (text: string) => number | null;
  format: (value: number) => string;
  onCommit: (value: number) => void;
  /** What to say when the text is not valid. */
  problem: string;
  inputMode?: 'decimal' | 'text';
  prefix?: string;
  suffix?: string;
  /** Extra guidance shown under the field and read with it. */
  note?: string | null;
}

/**
 * A text field for an amount or a percentage. It accepts a value as soon as what is typed is valid, says what is wrong
 * while it is not, and goes back to the last good value when the person leaves it.
 */
export function ParsedField({
  label,
  value,
  parse,
  format,
  onCommit,
  problem,
  inputMode = 'decimal',
  prefix,
  suffix,
  note,
}: Props) {
  const id = useId();
  // while the person is typing, show what they typed; otherwise always show the current value, so a reset is seen at once
  const [typed, setTyped] = useState('');
  const [editing, setEditing] = useState(false);
  const text = editing ? typed : format(value);
  const invalid = parse(text) === null;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        {prefix && <span aria-hidden="true">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={text}
          aria-invalid={invalid && editing}
          aria-describedby={`${id}-msg`}
          onFocus={() => {
            setTyped(format(value));
            setEditing(true);
          }}
          onChange={(e) => {
            setTyped(e.target.value);
            const parsed = parse(e.target.value);
            if (parsed !== null) onCommit(parsed);
          }}
          onBlur={() => setEditing(false)}
        />
        {suffix && <span aria-hidden="true">{suffix}</span>}
      </div>
      <p id={`${id}-msg`} className={invalid && editing ? 'problem' : 'note'}>
        {invalid && editing ? problem : (note ?? '')}
      </p>
    </div>
  );
}
