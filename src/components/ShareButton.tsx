import { useState } from 'react';

/** Copies the page address, which holds the whole scenario, so a plan can be shared as a link. */
export function ShareButton() {
  const [message, setMessage] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage('Link copied. It holds all your debts and choices.');
    } catch {
      setMessage('Could not copy. The address in your browser already holds all your debts and choices.');
    }
  }

  return (
    <div className="share">
      <button type="button" onClick={copy}>
        Copy a link to this plan
      </button>
      <span role="status" className="note">
        {message}
      </span>
    </div>
  );
}
