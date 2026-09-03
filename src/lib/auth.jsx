import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { account, teams, APPWRITE_TEAM_ID } from './appwrite.js';

const AuthContext = createContext(null);

// Role žije v členství v Appwrite Teamu isms-staff (ne v samostatné tabulce
// uživatelů) — viz project memory. Nejvyšší role vyhrává, kdyby jich uživatel
// měl přiřazeno víc.
function highestRole(roles) {
  if (roles.includes('manager')) return 'manager';
  if (roles.includes('editor')) return 'editor';
  if (roles.includes('reader')) return 'reader';
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const acc = await account.get();
      // teams.listMemberships() redacts userId/userName/userEmail for
      // non-admin callers, so a client-side .find() by acc.$id silently
      // always fails — filter server-side instead (see project memory).
      const memberships = await teams.listMemberships(APPWRITE_TEAM_ID, [Query.equal('userId', acc.$id)]);
      const own = memberships.memberships[0];
      setUser({ id: acc.$id, name: acc.name, email: acc.email, title: acc.prefs?.title ?? null, role: own ? highestRole(own.roles) : null });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const login = async (email, password) => {
    await account.createEmailPasswordSession(email, password);
    await load();
  };

  const logout = async () => {
    try { await account.deleteSession('current'); } catch { /* session mohla mezitím vypršet */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Oprávnění: editor a manažer upravují, jen manažer maže a vidí auditní stopu
export const canEdit = (user) => user?.role === 'editor' || user?.role === 'manager';
export const canDelete = (user) => user?.role === 'manager';
export const isManager = (user) => user?.role === 'manager';

export const ROLE_LABELS = {
  manager: 'Manažer ISMS',
  editor: 'Editor',
  reader: 'Čtenář',
};
