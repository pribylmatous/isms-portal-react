import { NAV_ITEMS } from '../data.js';
import { useAuth } from '../lib/auth.jsx';

export default function Sidebar({ section, onNavigate }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  return (
    <aside className="sidebar">
      <div className="sidebar__heading">ISMS &middot; ISO/IEC 27001</div>
      <nav aria-label="Sekce ISMS">
        {items.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar__footer">
        Centrum dopravního výzkumu, v.v.i.<br />
        Manažer kybernetické bezpečnosti
      </div>
    </aside>
  );
}
