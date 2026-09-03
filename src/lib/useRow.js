import { useCallback, useEffect, useState } from 'react';
import { tablesDB, APPWRITE_DATABASE_ID } from './appwrite.js';

// Single-row TablesDB read (tablesDB.getRow), same loading/error/reload
// shape as useTable/useFn — for ticket detail views (incidents/changes)
// that used to be a separate GET /api/incidents/:id in the Express API.
export default function useRow(tableId, rowId, { mapRow = (r) => r } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await tablesDB.getRow({ databaseId: APPWRITE_DATABASE_ID, tableId, rowId });
      setData(mapRow(row));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, rowId]);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload };
}
