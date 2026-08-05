import { useRef, useState } from 'react';
import useApi from '../lib/useApi.js';
import { apiUrl, post, put, del } from '../lib/api.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import { policyBadge } from '../lib/status.js';
import { isoToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

const formatSize = (bytes) => {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / (1024 * 1024) >= 1 ? bytes / (1024 * 1024) : bytes / 1024).toFixed(1)} ${bytes / (1024 * 1024) >= 1 ? 'MB' : 'kB'}`;
};

export default function Policies() {
  const { user } = useAuth();
  const { data: policies, loading, error, reload } = useApi('/api/policies');
  const { data: owners } = useApi('/api/policies/owners');
  const [modal, setModal] = useState(null); // null | { record: null } | { record }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const nameRef = useRef(null);

  const editing = modal?.record ?? null;
  const openModal = (record = null) => { setFormError(null); setModal({ record }); };

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (file && nameRef.current && !nameRef.current.value.trim()) {
      nameRef.current.value = file.name.replace(/\.[^.]+$/, '');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await put(`/api/policies/${editing.id}`, fd);
      } else {
        await post('/api/policies', fd);
      }
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Opravdu smazat dokument „${p.name}"?`)) return;
    try {
      await del(`/api/policies/${p.id}`);
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Knihovna dokumentů a politik"
        lead="Řízená dokumentace ISMS – politiky, směrnice a záznamy."
        buttonLabel={canEdit(user) ? 'Nahrát dokument' : undefined}
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card-grid-3">
          {(policies ?? []).map((p) => (
            <div key={p.id} className="card policy">
              <div className="policy__category">{p.category}</div>
              <div className="policy__name">{p.name}</div>
              <div className="policy__meta">Verze {p.version} &middot; aktualizováno {isoToCz(p.updated_at)}</div>
              <div className="policy__meta">Vlastník: {p.owner}</div>
              <div className="policy__meta">
                {p.file_name
                  ? <a href={apiUrl(`/api/policies/${p.id}/file`)} target="_blank" rel="noreferrer">{p.file_name}</a>
                  : <span className="cell-muted">Bez přiloženého souboru</span>}
                {p.file_size != null && <> &middot; {formatSize(p.file_size)}</>}
              </div>
              <div className="policy__foot">
                <Badge type={policyBadge(p.status)}>{p.status}</Badge>
                <RowActions
                  onEdit={canEdit(user) ? () => openModal(p) : undefined}
                  onDelete={canDelete(user) ? () => remove(p) : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? 'Upravit dokument' : 'Nahrát dokument'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label htmlFor="policy-file">{editing ? 'Nahradit soubor' : 'Soubor'}</label>
              <input
                id="policy-file" name="file" type="file" className="input"
                accept=".pdf,.doc,.docx,.odt" required={!editing} onChange={onFilePicked}
              />
              <div className="form-hint">
                {editing && editing.file_name && <>Aktuální soubor: <a href={apiUrl(`/api/policies/${editing.id}/file`)} target="_blank" rel="noreferrer">{editing.file_name}</a>. Nová volba ho nahradí. </>}
                Povolené formáty: PDF, DOC, DOCX, ODT (max 20 MB).
              </div>
            </div>
            <div className="field">
              <label htmlFor="policy-name">Název dokumentu</label>
              <input id="policy-name" name="name" ref={nameRef} className="input" required defaultValue={editing?.name ?? ''} placeholder="Např. Politika zálohování" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="policy-category">Kategorie</label>
                <select id="policy-category" name="category" className="select" defaultValue={editing?.category ?? 'Řídicí dokumentace'}>
                  <option>Řídicí dokumentace</option>
                  <option>Postupy</option>
                  <option>Záznamy</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="policy-owner">Vlastník</label>
                <select id="policy-owner" name="owner" className="select" required defaultValue={editing?.owner ?? ''}>
                  {!editing && <option value="" disabled>Vyberte vlastníka…</option>}
                  {editing && !(owners ?? []).includes(editing.owner) && (
                    <option value={editing.owner}>{editing.owner}</option>
                  )}
                  {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {editing && (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="policy-version">Verze</label>
                  <input id="policy-version" name="version" className="input" required defaultValue={editing.version} />
                </div>
                <div className="field">
                  <label htmlFor="policy-status">Stav</label>
                  <select id="policy-status" name="status" className="select" defaultValue={editing.status}>
                    <option>Návrh</option>
                    <option>K revizi</option>
                    <option>Schváleno</option>
                  </select>
                </div>
              </div>
            )}
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat dokument'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
