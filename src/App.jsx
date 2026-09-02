import { useEffect, useRef, useState } from 'react';
import { useAuth } from './lib/auth.jsx';
import Login from './components/Login.jsx';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import Footer from './components/Footer.jsx';
import Dashboard from './sections/Dashboard.jsx';
import Controls from './sections/Controls.jsx';
import Risks from './sections/Risks.jsx';
import Policies from './sections/Policies.jsx';
import Audits from './sections/Audits.jsx';
import Deadlines from './sections/Deadlines.jsx';
import Changes from './sections/Changes.jsx';
import Incidents from './sections/Incidents.jsx';
import Training from './sections/Training.jsx';
import AuditLog from './sections/AuditLog.jsx';
import Users from './sections/Users.jsx';

const SECTIONS = {
  dashboard: Dashboard,
  controls: Controls,
  risks: Risks,
  policies: Policies,
  audits: Audits,
  deadlines: Deadlines,
  changes: Changes,
  incidents: Incidents,
  training: Training,
  'audit-log': AuditLog,
  users: Users,
};

// Ruční hash routing (žádná knihovna) — jen aby šel incident odkázat přímo
// (#/incidents/INC-01, viz Incidents.jsx). Sekce čte jen první segment,
// zbytek cesty si parsuje sama sekce, které patří (podobně jako incidenty).
function sectionFromHash() {
  const segment = window.location.hash.slice(2).split('/')[0];
  return SECTIONS[segment] ? segment : 'dashboard';
}

export default function App() {
  const { user, loading } = useAuth();
  const [section, setSection] = useState(sectionFromHash);
  const mainRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => setSection(sectionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [section]);

  const navigate = (id) => {
    window.location.hash = `/${id}`;
    setSection(id);
  };

  if (loading) return <div className="auth-splash">Načítám…</div>;
  if (!user) return <Login />;

  const Section = SECTIONS[section];

  return (
    <div className="app">
      <Header onNavigateHome={() => navigate('dashboard')} />
      <div className="shell">
        <Sidebar section={section} onNavigate={navigate} />
        <main ref={mainRef} className="main">
          <Section />
        </main>
      </div>
      <Footer />
    </div>
  );
}
