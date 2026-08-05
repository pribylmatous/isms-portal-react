import { useState } from 'react';
import useApi from '../lib/useApi.js';
import { post, put, del } from '../lib/api.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import { incidentBadge, priorityBadge } from '../lib/status.js';
import { isoToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

const CATEGORIES = ['Narušení dat', 'Malware', 'Neoprávněný přístup', 'Dostupnost/výpadek', 'Phishing', 'Jiné'];
const STATUSES = ['Nové', 'V řešení', 'Eskalováno', 'Vyřešeno', 'Uzavřeno'];

export default function Incidents() {
  const { user } = useAuth();
  const { data: incidents, loading, error, reload } = useApi('/api/incidents');
  const { data: owners } = useApi('/api/incidents/owners');
  const { data: controls } = useApi('/api/controls');
  const { data: risks } = useApi('/api/risks');
  const [modal, setModal] = useState(null); // null | { record: null } | { record }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

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
      if (editing) {
        await put(`/api/incidents/${editing.id}`, {
          ...payload,
          status: fd.get('status'),
          resolved_at: fd.get('resolved_at') || null,
          resolution: fd.get('resolution'),
        });
      } else {
        await post('/api/incidents', payload);
      }
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
      await del(`/api/incidents/${i.id}`);
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
                  <td className="cell-id">{i.id}</td>
                  <td>{i.title}</td>
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
          <form className="form-grid" onSubmit={submit}>
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
                <label htmlFor="incident-owner">Vlastník (řeší)</label>
                <select id="incident-owner" name="owner" className="select" required defaultValue={editing?.owner ?? ''}>
                  {!editing && <option value="" disabled>Vyberte vlastníka…</option>}
                  {editing && !(owners ?? []).includes(editing.owner) && (
                    <option value={editing.owner}>{editing.owner}</option>
                  )}
                  {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="incident-occurred">Datum vzniku</label>
                <input id="incident-occurred" name="occurred_at" type="date" className="input" required defaultValue={editing?.occurred_at ?? ''} />
              </div>
              {editing && (
                <div className="field">
                  <label htmlFor="incident-resolved">Datum vyřešení</label>
                  <input id="incident-resolved" name="resolved_at" type="date" className="input" defaultValue={editing?.resolved_at ?? ''} />
                </div>
              )}
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
            {editing && (
              <>
                <div className="field">
                  <label htmlFor="incident-status">Stav</label>
                  <select id="incident-status" name="status" className="select" defaultValue={editing.status}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="incident-resolution">Řešení / kořenová příčina</label>
                  <textarea id="incident-resolution" name="resolution" className="textarea" defaultValue={editing?.resolution ?? ''} placeholder="Nepovinné" />
                </div>
              </>
            )}
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat incident'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
