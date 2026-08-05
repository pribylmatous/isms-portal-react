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
  changes: Changes,
  incidents: Incidents,
  training: Training,
  'audit-log': AuditLog,
  users: Users,
};

export default function App() {
  const { user, loading } = useAuth();
  const [section, setSection] = useState('dashboard');
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [section]);

  if (loading) return <div className="auth-splash">Načítám…</div>;
  if (!user) return <Login />;

  const Section = SECTIONS[section];

  return (
    <div className="app">
      <Header onNavigateHome={() => setSection('dashboard')} />
      <div className="shell">
        <Sidebar section={section} onNavigate={setSection} />
        <main ref={mainRef} className="main">
          <Section />
        </main>
      </div>
      <Footer />
    </div>
  );
}
