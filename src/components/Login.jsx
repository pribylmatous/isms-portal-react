import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { get, apiUrl } from '../lib/api.js';
import Button from './Button.jsx';
import LionLogo from './LionLogo.jsx';

const SSO_ERRORS = {
  'no-role': 'Váš účet zatím nemá v Azure AD přiřazenou žádnou roli ISMS — požádejte administrátora o přiřazení.',
  'inactive': 'Tento účet je deaktivovaný. Obraťte se na správce portálu.',
  'start-failed': 'Přihlášení přes Microsoft se nepodařilo spustit. Zkuste to prosím znovu.',
  'callback-failed': 'Přihlášení přes Microsoft se nezdařilo. Zkuste to prosím znovu.',
};

function useSsoError() {
  const [code] = useState(() => new URLSearchParams(window.location.search).get('ssoError'));
  useEffect(() => {
    if (!code) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('ssoError');
    window.history.replaceState({}, '', url);
  }, [code]);
  return code ? (SSO_ERRORS[code] ?? 'Přihlášení přes Microsoft se nezdařilo.') : null;
}

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const ssoError = useSsoError();

  useEffect(() => {
    get('/api/auth/config').then((c) => setSsoEnabled(c.ssoEnabled)).catch(() => setSsoEnabled(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setBusy(true);
    setError(null);
    try {
      await login(fd.get('username'), fd.get('password'));
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
        {ssoError && <div className="form-error">{ssoError}</div>}
        {ssoEnabled && (
          <>
            <Button onClick={() => { window.location.href = apiUrl('/api/auth/sso/start'); }}>
              Přihlásit se přes Microsoft
            </Button>
            <div className="login-divider">nebo lokální účet</div>
          </>
        )}
        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-username">Uživatelské jméno</label>
            <input id="login-username" name="username" className="input" required autoFocus autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="login-password">Heslo</label>
            <input id="login-password" name="password" type="password" className="input" required autoComplete="current-password" />
          </div>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" variant={ssoEnabled ? 'secondary' : 'primary'} disabled={busy}>
            {busy ? 'Přihlašuji…' : 'Přihlásit se'}
          </Button>
        </form>
        <div className="login-note">Interní nástroj — přístup mají pouze zaměstnanci CDV.</div>
      </div>
    </div>
  );
}
