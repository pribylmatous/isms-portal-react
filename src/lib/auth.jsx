import { createContext, useContext, useEffect, useState } from 'react';
import { get, post } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/api/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    setUser(await post('/api/auth/login', { username, password }));
  };

  const logout = async () => {
    try {
      await post('/api/auth/logout');
    } catch {
      // session mohla mezitím vypršet — odhlásíme aspoň lokálně
    }
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
