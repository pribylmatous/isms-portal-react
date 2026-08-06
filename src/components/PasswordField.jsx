import { useState } from 'react';

function EyeIcon({ off }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {off ? (
        <>
          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-6 0-9.7-5.5-10.53-7a17.7 17.7 0 0 1 3.24-4.09M9.9 4.24A10.15 10.15 0 0 1 12 4c6 0 9.7 5.5 10.53 7a17.7 17.7 0 0 1-2.06 2.94" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M1 1l22 22" />
        </>
      ) : (
        <>
          <path d="M1.47 12C2.3 10.5 6 5 12 5s9.7 5.5 10.53 7C21.7 13.5 18 19 12 19S2.3 13.5 1.47 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export default function PasswordField({ id, name, minLength, required, defaultValue, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id} name={name} type={visible ? 'text' : 'password'} className="input"
        minLength={minLength} required={required} defaultValue={defaultValue}
        placeholder={placeholder} autoComplete={autoComplete}
      />
      <button
        type="button" className="password-field__toggle" onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Skrýt heslo' : 'Zobrazit heslo'} aria-pressed={visible} aria-controls={id}
        tabIndex={-1}
      >
        <EyeIcon off={visible} />
      </button>
    </div>
  );
}
