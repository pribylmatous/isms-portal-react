import { useEffect, useState } from 'react';
import useApi from '../lib/useApi.js';
import { post, put, del } from '../lib/api.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import { changeBadge } from '../lib/status.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';
import ChangeDetail from './ChangeDetail.jsx';

// Ruční hash routing pro přímý odkaz na změnu (#/changes/CHG-01, viz App.jsx).
const parseChangeIdFromHash = () => {
  const m = window.location.hash.match(/^#\/changes\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
};

export default function Changes() {
  const { user } = useAuth();
  const { data: changes, loading, error, reload } = useApi('/api/changes');
  const { data: owners } = useApi('/api/changes/owners');
  const { data: controls } = useApi('/api/controls');
  const { data: risks } = useApi('/api/risks');
  const [modal, setModal] = useState(null); // null | { record: null } | { record }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [selectedId, setSelectedId] = useState(parseChangeIdFromHash);

  useEffect(() => {
    const onHashChange = () => setSelectedId(parseChangeIdFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const openDetail = (id) => { window.location.hash = `/changes/${id}`; setSelectedId(id); };
  const closeDetail = () => { window.location.hash = '/changes'; setSelectedId(null); };

  const editing = modal?.record ?? null;
  const openModal = (record = null) => { setFormError(null); setModal({ record }); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      title: fd.get('title'),
      description: fd.get('description'),
      type: fd.get('type'),
      risk_level: fd.get('risk_level'),
      owner: fd.get('owner'),
      control_id: fd.get('control_id') || '',
      risk_id: fd.get('risk_id') || '',
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await put(`/api/changes/${editing.id}`, payload);
      else await post('/api/changes', { ...payload, planned_date: fd.get('planned_date') || null });
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Opravdu smazat změnu ${c.id} – ${c.title}?`)) return;
    try {
      await del(`/api/changes/${c.id}`);
      if (selectedId === c.id) closeDetail();
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  const linkLabel = (c) => {
    if (c.control_id) return `Opatření: ${c.control_id}`;
    if (c.risk_id) return `Riziko: ${c.risk_id}`;
    return 'Bez vazby';
  };

  if (selectedId) {
    return (
      <>
        <ChangeDetail id={selectedId} onBack={closeDetail} onEdit={openModal} />
        {modal && (
          <Modal key={editing?.id ?? 'new'} title={`Upravit změnu ${editing.id}`} onClose={() => setModal(null)}>
            <ChangeForm
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
        title="Řízení změn"
        lead="Evidence změn dle ITIL (opatření A.8.32) — typ, riziko změny a vazba na opatření nebo riziko."
        buttonLabel={canEdit(user) ? 'Nová změna' : undefined}
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col style={{ width: 70 }} /><col /><col style={{ width: 120 }} /><col style={{ width: 110 }} />
              <col style={{ width: 130 }} /><col style={{ width: 200 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr><th>ID</th><th>Změna</th><th>Typ</th><th>Riziko</th><th>Stav</th><th>Vlastník / Vazba</th><th></th></tr>
            </thead>
            <tbody>
              {(changes ?? []).map((c) => (
                <tr key={c.id}>
                  <td className="cell-id">
                    <button type="button" className="link-cell" onClick={() => openDetail(c.id)}>{c.id}</button>
                  </td>
                  <td>
                    <button type="button" className="link-cell" onClick={() => openDetail(c.id)}>{c.title}</button>
                  </td>
                  <td className="cell-muted">{c.type}</td>
                  <td className="cell-muted">{c.risk_level}</td>
                  <td><Badge type={changeBadge(c.status)}>{c.status}</Badge></td>
                  <td>
                    <div className="cell-strong">{c.owner}</div>
                    <div className="cell-sub">{linkLabel(c)}</div>
                  </td>
                  <td>
                    <RowActions
                      onEdit={canEdit(user) ? () => openModal(c) : undefined}
                      onDelete={canDelete(user) ? () => remove(c) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? `Upravit změnu ${editing.id}` : 'Nová změna'} onClose={() => setModal(null)}>
          <ChangeForm
            editing={editing} owners={owners} controls={controls} risks={risks}
            saving={saving} formError={formError} onSubmit={submit} onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}

// Popisná pole změny — stav/plánovaný a skutečný termín se mění jen přes akce
// v ChangeDetail, ne odsud (viz PUT /api/changes/:id). Plánovaný termín jde
// zadat jen při založení (jako počáteční odhad) — po založení ho nastavuje
// akce „Naplánovat".
function ChangeForm({ editing, owners, controls, risks, saving, formError, onSubmit, onCancel }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="change-title">Název změny</label>
        <input id="change-title" name="title" className="input" required defaultValue={editing?.title ?? ''} placeholder="Např. Upgrade firewallu na verzi X" />
      </div>
      <div className="field">
        <label htmlFor="change-description">Popis</label>
        <textarea id="change-description" name="description" className="textarea" defaultValue={editing?.description ?? ''} placeholder="Nepovinné – důvod a rozsah změny" />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="change-type">Typ změny</label>
          <select id="change-type" name="type" className="select" defaultValue={editing?.type ?? 'Normální'}>
            <option>Standardní</option>
            <option>Normální</option>
            <option>Nouzová</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="change-risk">Riziko změny</label>
          <select id="change-risk" name="risk_level" className="select" defaultValue={editing?.risk_level ?? 'Nízké'}>
            <option>Nízké</option>
            <option>Střední</option>
            <option>Vysoké</option>
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="change-owner">Vlastník</label>
          <select id="change-owner" name="owner" className="select" required defaultValue={editing?.owner ?? ''}>
            {!editing && <option value="" disabled>Vyberte vlastníka…</option>}
            {editing && !(owners ?? []).includes(editing.owner) && (
              <option value={editing.owner}>{editing.owner}</option>
            )}
            {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        {!editing && (
          <div className="field">
            <label htmlFor="change-planned">Plánovaný termín (odhad)</label>
            <input id="change-planned" name="planned_date" type="date" className="input" />
          </div>
        )}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="change-control">Související opatření (nepovinné)</label>
          <select id="change-control" name="control_id" className="select" defaultValue={editing?.control_id ?? ''}>
            <option value="">— žádné —</option>
            {(controls ?? []).map((c) => <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="change-risklink">Související riziko (nepovinné)</label>
          <select id="change-risklink" name="risk_id" className="select" defaultValue={editing?.risk_id ?? ''}>
            <option value="">— žádné —</option>
            {(risks ?? []).map((r) => <option key={r.id} value={r.id}>{r.id} — {r.name}</option>)}
          </select>
        </div>
      </div>
      {formError && <div className="form-error">{formError}</div>}
      <div className="modal__actions">
        <Button variant="secondary" onClick={onCancel}>Zrušit</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat změnu'}</Button>
      </div>
    </form>
  );
}
