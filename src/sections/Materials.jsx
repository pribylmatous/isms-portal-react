import { useEffect, useRef, useState } from 'react';
import { ID } from 'appwrite';
import useFn from '../lib/useFn.js';
import { callFn } from '../lib/fn.js';
import { storage, APPWRITE_DOCUMENTS_BUCKET_ID } from '../lib/appwrite.js';
import { useAuth, isManager, ROLE_LABELS } from '../lib/auth.jsx';
import { trainingColor } from '../lib/status.js';
import { isoToCz, isoDateTimeToCz } from '../lib/utils.js';
import DataState from '../components/DataState.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

const formatSize = (bytes) => {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / (1024 * 1024) >= 1 ? bytes / (1024 * 1024) : bytes / 1024).toFixed(1)} ${bytes / (1024 * 1024) >= 1 ? 'MB' : 'kB'}`;
};

const ROLE_KEYS = ['reader', 'editor', 'manager'];

// Obdoba myStatusBadge z Training.jsx, jen bez skóre — tady jde jen o to,
// jestli a kdy uživatel materiál potvrdil jako přečtený.
const myReadBadge = (myReadAt) => (myReadAt
  ? { type: 'success', label: `Vy: přečteno (${isoDateTimeToCz(myReadAt)})` }
  : { type: 'neutral', label: 'Vy: nepřečteno' });

function MaterialAdminModal({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [targetRoles, setTargetRoles] = useState(initial?.targetRoles ?? ROLE_KEYS);
  const [due, setDue] = useState(initial?.due ?? '');
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleRole = (role) => setTargetRoles((rs) => (rs.includes(role) ? rs.filter((r) => r !== role) : [...rs, role]));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const file = fileRef.current?.files?.[0];
      let fileMeta = {};
      if (file) {
        const uploaded = await storage.createFile({ bucketId: APPWRITE_DOCUMENTS_BUCKET_ID, fileId: ID.unique(), file });
        fileMeta = { file_id: uploaded.$id, file_name: file.name, file_size: uploaded.sizeOriginal, file_mime: uploaded.mimeType };
      }
      const payload = { name, description, target_roles: targetRoles, due, ...fileMeta };
      const previousFileId = editing ? initial.fileId : null;
      if (editing) await callFn('registries-fn', `/study-materials/${initial.id}`, 'PUT', payload);
      else await callFn('registries-fn', '/study-materials', 'POST', payload);
      if (fileMeta.file_id && previousFileId) {
        storage.deleteFile({ bucketId: APPWRITE_DOCUMENTS_BUCKET_ID, fileId: previousFileId }).catch(() => {});
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? `Upravit materiál: ${initial.name}` : 'Nový materiál'} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="mat-name">Název</label>
          <input id="mat-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="mat-description">Popis / odkaz (nepovinné)</label>
          <textarea
            id="mat-description" className="input" rows={3} value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="mat-file">{editing ? 'Nahradit soubor' : 'Soubor (nepovinné)'}</label>
          <input id="mat-file" ref={fileRef} name="file" type="file" className="input" accept=".pdf,.doc,.docx,.odt" />
          <div className="form-hint">
            {editing && initial.fileName && (
              <>Aktuální soubor: {initial.fileName}. Nová volba ho nahradí. </>
            )}
            Povolené formáty: PDF, DOC, DOCX, ODT (max 20 MB). Bez souboru stačí popis/odkaz výše.
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Cílová skupina (podle role)</label>
            {ROLE_KEYS.map((role) => (
              <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, padding: '4px 0' }}>
                <input type="checkbox" checked={targetRoles.includes(role)} onChange={() => toggleRole(role)} />
                {ROLE_LABELS[role]}
              </label>
            ))}
            {targetRoles.length === 0 && <div className="form-error">Vyberte alespoň jednu roli.</div>}
          </div>
          <div className="field">
            <label htmlFor="mat-due">Termín přečtení</label>
            <input id="mat-due" type="date" className="input" required value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal__actions">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button type="submit" disabled={saving || targetRoles.length === 0}>{saving ? 'Ukládám…' : 'Uložit'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ReadsModal({ material, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    callFn('registries-fn', `/study-materials/${material.id}/reads`, 'GET').then(setRows).catch((err) => setError(err.message));
  }, [material.id]);

  return (
    <Modal title={`Přehled přečtení: ${material.name}`} onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      {!rows && !error && <div>Načítám…</div>}
      {rows && (
        <table className="table">
          <thead><tr><th>Uživatel</th><th>Role</th><th>Stav</th><th>Přečteno</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td className="cell-muted">{ROLE_LABELS[r.role] ?? r.role}</td>
                <td>
                  {r.readAt
                    ? <Badge type="success">Přečteno</Badge>
                    : <Badge type="neutral">Nepřečteno</Badge>}
                </td>
                <td className="cell-muted">{r.readAt ? isoDateTimeToCz(r.readAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export default function Materials() {
  const { user } = useAuth();
  const manager = isManager(user);
  const materials = useFn('registries-fn', '/study-materials');
  const [adminModal, setAdminModal] = useState(null); // null | { initial: null | fullRecord }
  const [readsMaterial, setReadsMaterial] = useState(null); // null | material
  const [marking, setMarking] = useState(null); // id materiálu, který se právě označuje jako přečtený

  const openEdit = async (m) => {
    try {
      const full = await callFn('registries-fn', `/study-materials/${m.id}`, 'GET');
      setAdminModal({ initial: full });
    } catch (err) {
      window.alert(`Nepodařilo se načíst materiál: ${err.message}`);
    }
  };

  const remove = async (m) => {
    if (!window.confirm(`Opravdu smazat materiál „${m.name}"? Smažou se i záznamy o přečtení.`)) return;
    try {
      const result = await callFn('registries-fn', `/study-materials/${m.id}`, 'DELETE');
      if (result?.file_id) storage.deleteFile({ bucketId: APPWRITE_DOCUMENTS_BUCKET_ID, fileId: result.file_id }).catch(() => {});
      materials.reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  const markRead = async (m) => {
    setMarking(m.id);
    try {
      await callFn('registries-fn', `/study-materials/${m.id}/read`, 'POST');
      materials.reload();
    } catch (err) {
      window.alert(`Nepodařilo se označit jako přečtené: ${err.message}`);
    } finally {
      setMarking(null);
    }
  };

  const fileUrl = (fileId) => storage.getFileDownload({ bucketId: APPWRITE_DOCUMENTS_BUCKET_ID, fileId });

  return (
    <>
      <PageHeader
        title="Materiály a dokumenty ke studiu"
        lead="Delší testy, školicí materiály a dokumenty ke studiu — s evidencí, kdo si je přečetl."
        buttonLabel={manager ? 'Nový materiál' : undefined}
        onButtonClick={() => setAdminModal({ initial: null })}
      />

      <DataState loading={materials.loading} error={materials.error} onRetry={materials.reload}>
        <div className="card-grid-3">
          {(materials.data ?? []).map((m) => {
            const mine = myReadBadge(m.myReadAt);
            return (
              <div key={m.id} className="card training">
                <div className="training__name">{m.name}</div>
                <div className="training__meta">{m.audience} &middot; termín {isoToCz(m.due)}</div>
                {m.description && <div className="training__meta">{m.description}</div>}
                <div className="training__meta">
                  {m.fileName
                    ? <a href={fileUrl(m.fileId)} target="_blank" rel="noreferrer">{m.fileName}</a>
                    : <span className="cell-muted">Bez přiloženého souboru</span>}
                  {m.fileSize != null && <> &middot; {formatSize(m.fileSize)}</>}
                </div>
                <ProgressBar pct={m.pct} color={trainingColor(m.pct)} />
                <div className="training__stats"><span>Přečteno</span><strong>{m.pct}%</strong></div>
                <Badge type={mine.type}>{mine.label}</Badge>
                {!m.myReadAt && (
                  <Button variant="secondary" disabled={marking === m.id} onClick={() => markRead(m)}>
                    {marking === m.id ? 'Označuji…' : 'Označit jako přečtené'}
                  </Button>
                )}
                {manager && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Button variant="secondary" onClick={() => setReadsMaterial(m)}>Přehled přečtení</Button>
                    <RowActions onEdit={() => openEdit(m)} onDelete={() => remove(m)} />
                  </div>
                )}
              </div>
            );
          })}
          {materials.data?.length === 0 && <div className="cell-muted">Zatím žádné materiály.</div>}
        </div>
      </DataState>

      {adminModal && (
        <MaterialAdminModal
          initial={adminModal.initial}
          onClose={() => setAdminModal(null)}
          onSaved={materials.reload}
        />
      )}

      {readsMaterial && (
        <ReadsModal material={readsMaterial} onClose={() => setReadsMaterial(null)} />
      )}
    </>
  );
}
