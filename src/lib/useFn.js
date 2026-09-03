import { useCallback, useEffect, useState } from 'react';
import { callFn } from './fn.js';

// GET-through-Function data hook, same shape as useTable — for endpoints
// where the Function itself must own the read (role-based visibility, live
// completion-% against Team roster, dashboard aggregation) so a direct
// TablesDB list read from the client isn't enough.
export default function useFn(functionId, path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await callFn(functionId, path, 'GET'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [functionId, path]);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload };
}
