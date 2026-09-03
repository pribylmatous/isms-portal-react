import { useCallback, useEffect, useState } from 'react';
import { Query } from 'appwrite';
import { tablesDB, APPWRITE_DATABASE_ID } from './appwrite.js';

// Direct TablesDB list read (no Function) — table permissions already grant
// isms-staff team members read access. mapRow/orderBy should be stable
// references (module-scope functions/constants), not defined inline in the
// calling component, since they aren't in reload()'s dependency array.
export default function useTable(tableId, { orderBy = '$id', direction = 'asc', mapRow = (r) => r, filter = null } = {}) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tablesDB.listRows({
        databaseId: APPWRITE_DATABASE_ID,
        tableId,
        queries: [Query.limit(100), direction === 'desc' ? Query.orderDesc(orderBy) : Query.orderAsc(orderBy), ...(filter ?? [])],
      });
      setRows(res.rows.map(mapRow));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, filter?.join?.(',')]);

  useEffect(() => { reload(); }, [reload]);

  return { rows, loading, error, reload };
}
