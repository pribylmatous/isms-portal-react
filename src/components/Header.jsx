import { useAuth, ROLE_LABELS } from '../lib/auth.jsx';
import Badge from './Badge.jsx';
import LionLogo from './LionLogo.jsx';

export default function Header({ onNavigateHome }) {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <button type="button" className="header__brand" onClick={onNavigateHome} aria-label="Přejít na přehled">
        <LionLogo />
        <div>
          <div className="header__title">CDV – Centrum dopravního výzkumu</div>
          <div className="header__subtitle">Systém řízení bezpečnosti informací (ISMS)</div>
        </div>
      </button>
      <div className="header__meta">
        <Badge type="default">ISO/IEC 27001:2022</Badge>
        <div className="header__divider" />
        <div className="header__user">
          <div className="header__user-name">{user.name}</div>
          <div className="header__user-role">
            {user.title ?? ROLE_LABELS[user.role]} &middot; {ROLE_LABELS[user.role]}
          </div>
        </div>
        <button type="button" className="logout-btn" onClick={logout}>Odhlásit</button>
      </div>
    </header>
  );
}
