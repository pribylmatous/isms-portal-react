import { useEffect, useState } from 'react';
import { callFn } from './fn.js';

// Live roster of active isms-staff accounts — replaces the old static
// OWNERS list (isms-api/src/lov.js's mix of departments + names) with real
// people from Appwrite Users. Reuses tickets-fn's /assignable (already
// built for incident/change resolver pickers, no role restriction, only
// active users) rather than /users (manager-only, and returns more than a
// plain owner dropdown needs).
export default function usePeople() {
  const [people, setPeople] = useState(null); // null while loading, else [{id, name}]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    callFn('tickets-fn', '/assignable', 'GET')
      .then((list) => { if (!cancelled) setPeople(list); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const names = (people ?? []).map((p) => p.name);
  return { people, names, loading, error };
}
