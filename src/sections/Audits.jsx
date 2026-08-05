import { useState } from 'react';
import useApi from '../lib/useApi.js';
import { post, put, del } from '../lib/api.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import { auditBadge, auditDateColor } from '../lib/status.js';
import { isoToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

export default function Audits() {
  const { user } = useAuth();
  const { data: findings, loading, error, reload } = useApi('/api/findings');
  const { data: owners } = useApi('/api/findings/owners');
  const [modal, setModal] = useState(null); // null | { record: null } | { record }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const editing = modal?.record ?? null;
  const openModal = (record = null) => { setFormError(null); setModal({ record }); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      finding: fd.get('finding'),
      type: fd.get('type'),
      due: fd.get('due'),
      owner: fd.get('owner'),
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await put(`/api/findings/${editing.id}`, { ...payload, status: fd.get('status') });
      } else {
        await post('/api/findings', payload);
      }
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (f) => {
    if (!window.confirm(`Opravdu smazat zjištění ${f.id}?`)) return;
    try {
      await del(`/api/findings/${f.id}`);
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Audity a nápravná opatření"
        lead="Zjištění z interních i externích auditů a jejich náprava (CAPA)."
        buttonLabel={canEdit(user) ? 'Nové zjištění' : undefined}
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col style={{ width: 60 }} /><col /><col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 110 }} /><col style={{ width: 160 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr><th>ID</th><th>Zjištění</th><th>Typ</th><th>Stav</th><th>Termín</th><th>Odpovědná osoba</th><th></th></tr>
            </thead>
            <tbody>
              {(findings ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="cell-id">{a.id}</td>
                  <td>{a.finding}</td>
                  <td className="cell-muted">{a.type}</td>
                  <td><Badge type={auditBadge(a.status)}>{a.status}</Badge></td>
                  <td style={{ fontWeight: 500, color: auditDateColor(a.status) }}>{isoToCz(a.due)}</td>
                  <td className="cell-muted">{a.owner}</td>
                  <td>
                    <RowActions
                      onEdit={canEdit(user) ? () => openModal(a) : undefined}
                      onDelete={canDelete(user) ? () => remove(a) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? `Upravit zjištění ${editing.id}` : 'Nové zjištění'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label htmlFor="audit-finding">Zjištění</label>
              <input id="audit-finding" name="finding" className="input" required defaultValue={editing?.finding ?? ''} placeholder="Popis zjištění z auditu" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="audit-type">Typ</label>
                <select id="audit-type" name="type" className="select" defaultValue={editing?.type ?? 'Neshoda'}>
                  <option>Neshoda</option>
                  <option>Doporučení</option>
                  <option>Pozorování</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="audit-due">Termín nápravy</label>
                <input id="audit-due" name="due" type="date" className="input" required defaultValue={editing?.due ?? ''} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="audit-owner">Odpovědná osoba</label>
              <select id="audit-owner" name="owner" className="select" required defaultValue={editing?.owner ?? ''}>
                {!editing && <option value="" disabled>Vyberte odpovědnou osobu…</option>}
                {editing && !(owners ?? []).includes(editing.owner) && (
                  <option value={editing.owner}>{editing.owner}</option>
                )}
                {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {editing && (
              <div className="field">
                <label htmlFor="audit-status">Stav</label>
                <select id="audit-status" name="status" className="select" defaultValue={editing.status}>
                  <option>Nové</option>
                  <option>V řešení</option>
                  <option>Po termínu</option>
                  <option>Uzavřeno</option>
                </select>
              </div>
            )}
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat zjištění'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
