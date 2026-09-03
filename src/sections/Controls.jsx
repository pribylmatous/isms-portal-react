import { useState } from 'react';
import useTable from '../lib/useTable.js';
import { tablesDB, APPWRITE_DATABASE_ID } from '../lib/appwrite.js';
import { callFn } from '../lib/fn.js';
import { useAuth, canEdit } from '../lib/auth.jsx';
import usePeople from '../lib/usePeople.js';
import { statusBadge, dateSeverity, DEADLINE_TONES } from '../lib/status.js';
import { isoToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

const mapRow = (r) => ({ id: r.$id, name: r.name, domain: r.domain, status: r.status, owner: r.owner, review_due: r.review_due ? r.review_due.slice(0, 10) : null });

const downloadSoA = async () => {
  const { filename, contentBase64 } = await callFn('registries-fn', '/controls/export.xlsx', 'GET');
  const binary = atob(contentBase64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const DOMAIN_FILTERS = [
  ['all', 'Vše'],
  ['Organizační', 'A.5 Organizační'],
  ['Lidské zdroje', 'A.6 Lidské zdroje'],
  ['Fyzická bezpečnost', 'A.7 Fyzická'],
  ['Technologická', 'A.8 Technologická'],
];

const STATUS_FILTERS = ['Vše', 'Zavedeno', 'Částečně zavedeno', 'Chybí'];

export default function Controls() {
  const { user } = useAuth();
  const { names: OWNERS } = usePeople();
  const { rows: controls, loading, error, reload } = useTable('controls', { mapRow });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Vše');

  const filtered = (controls ?? []).filter((c) =>
    (domainFilter === 'all' || c.domain === domainFilter)
    && (statusFilter === 'Vše' || c.status === statusFilter));

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setSaving(true);
    setFormError(null);
    try {
      const reviewDue = fd.get('review_due');
      await tablesDB.updateRow({
        databaseId: APPWRITE_DATABASE_ID, tableId: 'controls', rowId: editing.id,
        data: {
          status: fd.get('status'), owner: fd.get('owner'),
          review_due: reviewDue ? new Date(`${reviewDue}T00:00:00.000Z`).toISOString() : null,
          updated_at: new Date().toISOString(),
        },
      });
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Katalog opatření přílohy A"
        lead="Kompletní katalog 93 opatření dle ISO/IEC 27001:2022 ve 4 doménách."
        buttonLabel="Exportovat SoA"
        onButtonClick={downloadSoA}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="filter-bar">
          <div className="filter-chips">
            {DOMAIN_FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${domainFilter === value ? ' is-active' : ''}`}
                onClick={() => setDomainFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className="select filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtr podle stavu"
          >
            {STATUS_FILTERS.map((s) => <option key={s}>{s === 'Vše' ? 'Vše (stav)' : s}</option>)}
          </select>
          <span className="filter-count">{filtered.length} z {(controls ?? []).length}</span>
        </div>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col style={{ width: 70 }} /><col /><col style={{ width: 150 }} /><col style={{ width: 170 }} /><col style={{ width: 160 }} /><col style={{ width: 150 }} /><col style={{ width: 60 }} />
            </colgroup>
            <thead>
              <tr><th>ID</th><th>Opatření</th><th>Doména</th><th>Stav</th><th>Odpovědná osoba</th><th>Termín přezkoumání</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const dueSeverity = dateSeverity(c.review_due);
                return (
                  <tr key={c.id} className={dueSeverity !== 'neutral' ? `row-flag row-flag--${dueSeverity}` : undefined}>
                    <td className="cell-id">{c.id}</td>
                    <td>{c.name}</td>
                    <td className="cell-muted">{c.domain}</td>
                    <td><Badge type={statusBadge(c.status)}>{c.status}</Badge></td>
                    <td className="cell-muted">{c.owner}</td>
                    <td style={{ color: DEADLINE_TONES[dueSeverity], fontWeight: dueSeverity !== 'neutral' ? 500 : 400 }}>
                      {c.review_due ? isoToCz(c.review_due) : '—'}
                    </td>
                    <td><RowActions onEdit={canEdit(user) ? () => { setFormError(null); setEditing(c); } : undefined} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      {editing && (
        <Modal key={editing.id} title={`Upravit opatření ${editing.id}`} onClose={() => setEditing(null)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label>Opatření</label>
              <div className="form-static">{editing.name} <span className="cell-muted">({editing.domain})</span></div>
            </div>
            <div className="field">
              <label htmlFor="control-status">Stav zavedení</label>
              <select id="control-status" name="status" className="select" defaultValue={editing.status}>
                <option>Zavedeno</option>
                <option>Částečně zavedeno</option>
                <option>Chybí</option>
              </select>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="control-owner">Odpovědná osoba</label>
                <select id="control-owner" name="owner" className="select" required defaultValue={editing.owner}>
                  {!OWNERS.includes(editing.owner) && (
                    <option value={editing.owner}>{editing.owner}</option>
                  )}
                  {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="control-review">Termín přezkoumání</label>
                <input id="control-review" name="review_due" type="date" className="input" defaultValue={editing.review_due ?? ''} />
              </div>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setEditing(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : 'Uložit změny'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
