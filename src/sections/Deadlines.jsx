import { useState } from 'react';
import useApi from '../lib/useApi.js';
import { post, put, del } from '../lib/api.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import { dateSeverity } from '../lib/status.js';
import { isoToCz } from '../lib/utils.js';
import { NAV_ITEMS } from '../data.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

const SEVERITY_BADGE = { danger: 'alert', warn: 'warning', neutral: 'neutral' };

// Sekce portálu, na které lze termín navázat (viz LINKABLE_SECTIONS v routes.js) —
// odvozeno ze stejného seznamu jako navigace, aby popisky nikdy nerozjely.
const LINK_SECTIONS = NAV_ITEMS.filter((item) => item.id !== 'dashboard' && item.id !== 'deadlines');
const linkLabel = (id) => LINK_SECTIONS.find((s) => s.id === id)?.label ?? id;

export default function Deadlines() {
  const { user } = useAuth();
  const { data: deadlines, loading, error, reload } = useApi('/api/deadlines');
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
      owner: fd.get('owner'),
      due: fd.get('due'),
      link_section: fd.get('link_section') || null,
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await put(`/api/deadlines/${editing.id}`, payload);
      } else {
        await post('/api/deadlines', payload);
      }
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Opravdu smazat termín „${d.title}"?`)) return;
    try {
      await del(`/api/deadlines/${d.id}`);
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Nejbližší termíny"
        lead="Správa termínů zobrazovaných na přehledu — včetně těch už po termínu. Termíny školení a otevřených zjištění z auditů se doplňují automaticky (upravují se ve své sekci)."
        buttonLabel={canEdit(user) ? 'Nový termín' : undefined}
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col /><col style={{ width: 200 }} /><col style={{ width: 130 }} /><col style={{ width: 200 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr><th>Termín</th><th>Odpovědná osoba</th><th>Datum</th><th>Sekce</th><th></th></tr>
            </thead>
            <tbody>
              {(deadlines ?? []).map((d) => {
                const severity = dateSeverity(d.due);
                return (
                  <tr key={d.id}>
                    <td>{d.link_section ? <a href={`#/${d.link_section}`}>{d.title}</a> : d.title}</td>
                    <td className="cell-muted">{d.owner}</td>
                    <td>
                      <Badge type={SEVERITY_BADGE[severity]}>{isoToCz(d.due)}</Badge>
                    </td>
                    <td className="cell-muted">{d.link_section ? linkLabel(d.link_section) : '—'}</td>
                    <td>
                      {d.source === 'manual' ? (
                        <RowActions
                          onEdit={canEdit(user) ? () => openModal(d) : undefined}
                          onDelete={canDelete(user) ? () => remove(d) : undefined}
                        />
                      ) : (
                        <span className="cell-muted" title="Upravuje se ve zdrojové sekci">Automaticky</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deadlines?.length === 0 && (
                <tr><td colSpan={5} className="cell-muted">Žádné termíny.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? `Upravit termín` : 'Nový termín'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label htmlFor="deadline-title">Termín</label>
              <input id="deadline-title" name="title" className="input" required defaultValue={editing?.title ?? ''} placeholder="Např. Penetrační test webových aplikací" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="deadline-owner">Odpovědná osoba</label>
                <input id="deadline-owner" name="owner" className="input" required defaultValue={editing?.owner ?? ''} placeholder="Osoba, útvar nebo dodavatel" />
              </div>
              <div className="field">
                <label htmlFor="deadline-due">Datum</label>
                <input id="deadline-due" name="due" type="date" className="input" required defaultValue={editing?.due ?? ''} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="deadline-link">Odkaz na sekci (nepovinné)</label>
              <select id="deadline-link" name="link_section" className="select" defaultValue={editing?.link_section ?? ''}>
                <option value="">Bez odkazu</option>
                {LINK_SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat termín'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
