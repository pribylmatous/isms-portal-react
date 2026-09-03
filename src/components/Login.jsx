import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import Button from './Button.jsx';
import LionLogo from './LionLogo.jsx';
import PasswordField from './PasswordField.jsx';

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(true);
    setError(null);
    try {
      await login(fd.get('email'), fd.get('password'));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          <LionLogo />
          <div>
            <div className="header__title">CDV – Centrum dopravního výzkumu</div>
            <div className="header__subtitle">Systém řízení bezpečnosti informací (ISMS)</div>
          </div>
        </div>
        <h1 className="login-title">Přihlášení</h1>
        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">E-mail</label>
            <input id="login-email" name="email" type="email" className="input" required autoFocus autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="login-password">Heslo</label>
            <PasswordField id="login-password" name="password" required autoComplete="current-password" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" disabled={busy}>{busy ? 'Přihlašuji…' : 'Přihlásit se'}</Button>
        </form>
        <div className="login-note">Interní nástroj — přístup mají pouze zaměstnanci CDV.</div>
      </div>
    </div>
  );
}
