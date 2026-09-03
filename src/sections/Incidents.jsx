import { useEffect, useState } from 'react';
import useTable from '../lib/useTable.js';
import { callFn } from '../lib/fn.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import usePeople from '../lib/usePeople.js';
import { incidentBadge, priorityBadge } from '../lib/status.js';
import { isoToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';
import IncidentDetail from './IncidentDetail.jsx';

const CATEGORIES = ['Narušení dat', 'Malware', 'Neoprávněný přístup', 'Dostupnost/výpadek', 'Phishing', 'Jiné'];

const mapRow = (r) => ({
  id: r.$id, title: r.title, description: r.description, category: r.category, priority: r.priority,
  status: r.status, reported_by: r.reported_by, owner: r.owner, occurred_at: r.occurred_at ? r.occurred_at.slice(0, 10) : r.occurred_at,
  resolved_at: r.resolved_at, resolution: r.resolution, control_id: r.control_id, risk_id: r.risk_id,
  assigned_to_user_id: r.assigned_to_user_id, assigned_to_name: r.assigned_to_name,
});
const mapControl = (r) => ({ id: r.$id, name: r.name });
const mapRisk = (r) => ({ id: r.$id, name: r.name });

// Ruční hash routing pro přímý odkaz na ticket (#/incidents/INC-01, viz App.jsx).
const parseIncidentIdFromHash = () => {
  const m = window.location.hash.match(/^#\/incidents\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

export default function Incidents() {
  const { user } = useAuth();
  const { rows: incidents, loading, error, reload } = useTable('incidents', { mapRow });
  const { rows: controls } = useTable('controls', { mapRow: mapControl });
  const { rows: risks } = useTable('risks', { mapRow: mapRisk });
  const { names: owners } = usePeople();
  const [modal, setModal] = useState(null); // null | { record: null } | { record }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [selectedId, setSelectedId] = useState(parseIncidentIdFromHash);

  useEffect(() => {
    const onHashChange = () => setSelectedId(parseIncidentIdFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openDetail = (id) => { window.location.hash = `/incidents/${id}`; setSelectedId(id); };
  const closeDetail = () => { window.location.hash = '/incidents'; setSelectedId(null); };

  const editing = modal?.record ?? null;
  const openModal = (record = null) => { setFormError(null); setModal({ record }); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      category: fd.get('category'),
      priority: fd.get('priority'),
      reported_by: fd.get('reported_by'),
      owner: fd.get('owner'),
      occurred_at: fd.get('occurred_at'),
      control_id: fd.get('control_id') || '',
      risk_id: fd.get('risk_id') || '',
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await callFn('tickets-fn', `/incidents/${editing.id}`, 'PUT', payload);
      else await callFn('tickets-fn', '/incidents', 'POST', payload);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (i) => {
    if (!window.confirm(`Opravdu smazat incident ${i.id} – ${i.title}?`)) return;
    try {
      await callFn('tickets-fn', `/incidents/${i.id}`, 'DELETE');
      if (selectedId === i.id) closeDetail();
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  const linkLabel = (i) => {
    if (i.control_id) return `Opatření: ${i.control_id}`;
    if (i.risk_id) return `Riziko: ${i.risk_id}`;
    return 'Bez vazby';
  };

  if (selectedId) {
    return (
      <>
        <IncidentDetail id={selectedId} onBack={closeDetail} onEdit={openModal} />
        {modal && (
          <Modal key={editing?.id ?? 'new'} title={`Upravit incident ${editing.id}`} onClose={() => setModal(null)}>
            <IncidentForm
              editing={editing} owners={owners} controls={controls} risks={risks}
              saving={saving} formError={formError} onSubmit={submit} onCancel={() => setModal(null)}
            />
          </Modal>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Řízení incidentů"
        lead="Evidence bezpečnostních incidentů dle ITIL (opatření A.5.24–A.5.30)."
        buttonLabel={canEdit(user) ? 'Nový incident' : undefined}
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col style={{ width: 70 }} /><col /><col style={{ width: 140 }} /><col style={{ width: 100 }} />
              <col style={{ width: 110 }} /><col style={{ width: 90 }} /><col style={{ width: 200 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr><th>ID</th><th>Incident</th><th>Kategorie</th><th>Priorita</th><th>Stav</th><th>Vznik</th><th>Vlastník / Vazba</th><th></th></tr>
            </thead>
            <tbody>
              {(incidents ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="cell-id">
                    <button type="button" className="link-cell" onClick={() => openDetail(i.id)}>{i.id}</button>
                  </td>
                  <td>
                    <button type="button" className="link-cell" onClick={() => openDetail(i.id)}>{i.title}</button>
                  </td>
                  <td className="cell-muted">{i.category}</td>
                  <td><Badge type={priorityBadge(i.priority)}>{i.priority}</Badge></td>
                  <td><Badge type={incidentBadge(i.status)}>{i.status}</Badge></td>
                  <td className="cell-muted">{isoToCz(i.occurred_at)}</td>
                  <td>
                    <div className="cell-strong">{i.owner}</div>
                    <div className="cell-sub">{linkLabel(i)}</div>
                  </td>
                  <td>
                    <RowActions
                      onEdit={canEdit(user) ? () => openModal(i) : undefined}
                      onDelete={canDelete(user) ? () => remove(i) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? `Upravit incident ${editing.id}` : 'Nový incident'} onClose={() => setModal(null)}>
          <IncidentForm
            editing={editing} owners={owners} controls={controls} risks={risks}
            saving={saving} formError={formError} onSubmit={submit} onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}

// Popisná pole incidentu (název, kategorie, priorita, vazby, …) — stav se
// mění jen přes akce v IncidentDetail, ne odsud.
function IncidentForm({ editing, owners, controls, risks, saving, formError, onSubmit, onCancel }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="incident-title">Název incidentu</label>
        <input id="incident-title" name="title" className="input" required defaultValue={editing?.title ?? ''} placeholder="Např. Phishingový e-mail zaměstnanci HR" />
      </div>
      <div className="field">
        <label htmlFor="incident-description">Popis</label>
        <textarea id="incident-description" name="description" className="textarea" defaultValue={editing?.description ?? ''} placeholder="Nepovinné – co se stalo, jak bylo zjištěno" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="incident-category">Kategorie</label>
          <select id="incident-category" name="category" className="select" defaultValue={editing?.category ?? CATEGORIES[0]}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="incident-priority">Priorita</label>
          <select id="incident-priority" name="priority" className="select" defaultValue={editing?.priority ?? 'Střední'}>
            <option>Nízká</option>
            <option>Střední</option>
            <option>Vysoká</option>
            <option>Kritická</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="incident-reported">Nahlásil</label>
          <select id="incident-reported" name="reported_by" className="select" required defaultValue={editing?.reported_by ?? ''}>
            {!editing && <option value="" disabled>Vyberte osobu…</option>}
            {editing && !(owners ?? []).includes(editing.reported_by) && (
              <option value={editing.reported_by}>{editing.reported_by}</option>
            )}
            {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="incident-owner">Vlastník</label>
          <select id="incident-owner" name="owner" className="select" required defaultValue={editing?.owner ?? ''}>
            {!editing && <option value="" disabled>Vyberte vlastníka…</option>}
            {editing && !(owners ?? []).includes(editing.owner) && (
              <option value={editing.owner}>{editing.owner}</option>
            )}
            {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="incident-occurred">Datum vzniku</label>
        <input id="incident-occurred" name="occurred_at" type="date" className="input" required defaultValue={editing?.occurred_at ?? ''} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="incident-control">Související opatření (nepovinné)</label>
          <select id="incident-control" name="control_id" className="select" defaultValue={editing?.control_id ?? ''}>
            <option value="">— žádné —</option>
            {(controls ?? []).map((c) => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="incident-risklink">Související riziko (nepovinné)</label>
          <select id="incident-risklink" name="risk_id" className="select" defaultValue={editing?.risk_id ?? ''}>
            <option value="">— žádné —</option>
            {(risks ?? []).map((r) => <option key={r.id} value={r.id}>{r.id} — {r.name}</option>)}
          </select>
        </div>
      </div>
      {formError && <div className="form-error">{formError}</div>}
      <div className="modal__actions">
        <Button variant="secondary" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat incident'}</Button>
      </div>
    </form>
  );
}
