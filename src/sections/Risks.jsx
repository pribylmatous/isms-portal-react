import { useState } from 'react';
import useApi from '../lib/useApi.js';
import { post, put, del } from '../lib/api.js';
import { useAuth, canEdit, canDelete } from '../lib/auth.jsx';
import { riskBadge, riskColor } from '../lib/status.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

// U seedovaných rizik známe jen skóre — pro předvyplnění formuláře
// ho rozložíme na pravděpodobnost × dopad (1–4)
const splitScore = (score) => {
  for (let p = 4; p >= 1; p--) {
    if (score % p === 0 && score / p >= 1 && score / p <= 4) return [p, score / p];
  }
  return [2, 2];
};

export default function Risks() {
  const { user } = useAuth();
  const { data: risks, loading, error, reload } = useApi('/api/risks');
  const { data: owners } = useApi('/api/risks/owners');
  const [modal, setModal] = useState(null); // null | { record: null } (nové) | { record } (úprava)
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const editing = modal?.record ?? null;
  const openModal = (record = null) => { setFormError(null); setModal({ record }); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      name: fd.get('name'),
      asset: fd.get('asset'),
      probability: Number(fd.get('probability')),
      impact: Number(fd.get('impact')),
      owner: fd.get('owner'),
      treatment: fd.get('treatment'),
    };
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await put(`/api/risks/${editing.id}`, { ...payload, status: fd.get('status') });
      } else {
        await post('/api/risks', payload);
      }
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Opravdu smazat riziko ${r.id} – ${r.name}?`)) return;
    try {
      await del(`/api/risks/${r.id}`);
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  const [defP, defI] = editing
    ? (editing.probability != null && editing.impact != null
      ? [editing.probability, editing.impact]
      : splitScore(editing.score))
    : [2, 2];

  return (
    <>
      <PageHeader
        title="Registr rizik"
        lead="Hodnocení aktiv, hrozeb a zranitelností dle metodiky řízení rizik ISMS."
        buttonLabel={canEdit(user) ? 'Přidat riziko' : undefined}
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col style={{ width: 60 }} /><col /><col style={{ width: 180 }} /><col style={{ width: 80 }} /><col style={{ width: 110 }} /><col style={{ width: 220 }} /><col style={{ width: 90 }} />
            </colgroup>
            <thead>
              <tr><th>ID</th><th>Riziko</th><th>Aktivum</th><th>Skóre</th><th>Úroveň</th><th>Vlastník / Ošetření</th><th></th></tr>
            </thead>
            <tbody>
              {(risks ?? []).map((r) => (
                <tr key={r.id} style={r.status === 'Uzavřené' ? { opacity: .55 } : undefined}>
                  <td className="cell-id">{r.id}</td>
                  <td>{r.name}</td>
                  <td className="cell-muted">{r.asset}</td>
                  <td style={{ fontWeight: 700, color: riskColor(r.level) }}>{r.score}</td>
                  <td><Badge type={riskBadge(r.level)}>{r.level}</Badge></td>
                  <td>
                    <div className="cell-strong">{r.owner}</div>
                    <div className="cell-sub">{r.treatment ?? 'Ošetření zatím nestanoveno'}</div>
                  </td>
                  <td>
                    <RowActions
                      onEdit={canEdit(user) ? () => openModal(r) : undefined}
                      onDelete={canDelete(user) ? () => remove(r) : undefined}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? `Upravit riziko ${editing.id}` : 'Přidat riziko'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field">
              <label htmlFor="risk-name">Riziko</label>
              <input id="risk-name" name="name" className="input" required defaultValue={editing?.name ?? ''} placeholder="Např. Únik dat přes neřízené API" />
            </div>
            <div className="field">
              <label htmlFor="risk-asset">Dotčené aktivum</label>
              <input id="risk-asset" name="asset" className="input" required defaultValue={editing?.asset ?? ''} placeholder="Např. Webová aplikace" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="risk-probability">Pravděpodobnost (1–4)</label>
                <select id="risk-probability" name="probability" className="select" defaultValue={String(defP)}>
                  <option value="1">1 – nepravděpodobná</option>
                  <option value="2">2 – možná</option>
                  <option value="3">3 – pravděpodobná</option>
                  <option value="4">4 – téměř jistá</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="risk-impact">Dopad (1–4)</label>
                <select id="risk-impact" name="impact" className="select" defaultValue={String(defI)}>
                  <option value="1">1 – zanedbatelný</option>
                  <option value="2">2 – omezený</option>
                  <option value="3">3 – závažný</option>
                  <option value="4">4 – kritický</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="risk-owner">Vlastník rizika</label>
              <select id="risk-owner" name="owner" className="select" required defaultValue={editing?.owner ?? ''}>
                {!editing && <option value="" disabled>Vyberte vlastníka…</option>}
                {editing && !(owners ?? []).includes(editing.owner) && (
                  <option value={editing.owner}>{editing.owner}</option>
                )}
                {(owners ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="risk-treatment">Plán ošetření</label>
              <textarea id="risk-treatment" name="treatment" className="textarea" defaultValue={editing?.treatment ?? ''} placeholder="Nepovinné – navržená opatření" />
              <div className="form-hint">Skóre počítá server: pravděpodobnost × dopad; úroveň ≥8 Vysoké, ≥5 Střední, jinak Nízké.</div>
            </div>
            {editing && (
              <div className="field">
                <label htmlFor="risk-status">Stav</label>
                <select id="risk-status" name="status" className="select" defaultValue={editing.status}>
                  <option>Otevřené</option>
                  <option>Uzavřené</option>
                </select>
              </div>
            )}
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Přidat riziko'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
