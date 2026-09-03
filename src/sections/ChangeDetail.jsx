import { useEffect, useState } from 'react';
import { Query } from 'appwrite';
import useRow from '../lib/useRow.js';
import useTable from '../lib/useTable.js';
import { callFn } from '../lib/fn.js';
import { useAuth, canEdit } from '../lib/auth.jsx';
import { changeBadge, riskBadge } from '../lib/status.js';
import { isoToCz, isoDateTimeToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';

// Stavy, ve kterých má smysl (pře)přiřadit realizátora — ne po uzavření/zamítnutí.
const CAN_ASSIGN_STATUSES = new Set(['Návrh', 'Ke schválení', 'Schváleno', 'Naplánováno', 'Realizováno']);

const ACTIVITY_TYPE_LABELS = { status_change: 'Stav', assignment: 'Přiřazení', comment: 'Poznámka' };

const mapChange = (r) => ({
  id: r.$id, title: r.title, description: r.description, type: r.type, risk_level: r.risk_level,
  status: r.status, owner: r.owner, planned_date: r.planned_date, implemented_date: r.implemented_date,
  assigned_to_user_id: r.assigned_to_user_id, assigned_to_name: r.assigned_to_name,
});
const mapActivity = (r) => ({ id: r.$id, type: r.type, user_name: r.user_name, from_status: r.from_status, to_status: r.to_status, note: r.note, at: r.at });

function activityLine(entry) {
  const transition = entry.from_status && entry.to_status ? `${entry.from_status} → ${entry.to_status}` : null;
  if (entry.type === 'comment') return entry.note;
  if (entry.type === 'assignment') return [entry.note, transition].filter(Boolean).join(' — ');
  return [transition, entry.note].filter(Boolean).join(' — ');
}

function AssignControl({ assignable, currentId, busy, onAssign }) {
  const [value, setValue] = useState(currentId ?? '');
  return (
    <form
      className="ticket-assign"
      onSubmit={(e) => { e.preventDefault(); if (value) onAssign(value); }}
    >
      <select className="select" value={value} onChange={(e) => setValue(e.target.value)}>
        <option value="" disabled>Vyberte realizátora…</option>
        {(assignable ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <Button type="submit" variant="secondary" disabled={busy || !value}>
        {currentId ? 'Přeřadit' : 'Přiřadit realizátora'}
      </Button>
    </form>
  );
}

// Akce, co ke svému provedení potřebují text (důvod zamítnutí, znovuotevření, …).
function NoteAction({ label, placeholder, required, busy, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (!open) {
    return <Button variant="secondary" onClick={() => setOpen(true)}>{label}</Button>;
  }
  return (
    <form
      className="ticket-note-form"
      onSubmit={(e) => { e.preventDefault(); onSubmit(value.trim()); setValue(''); setOpen(false); }}
    >
      <textarea
        className="textarea" placeholder={placeholder} value={value} autoFocus
        onChange={(e) => setValue(e.target.value)} required={required}
      />
      <div className="ticket-note-form__buttons">
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setValue(''); }}>Zrušit</Button>
        <Button type="submit" disabled={busy || (required && !value.trim())}>{label}</Button>
      </div>
    </form>
  );
}

// Naplánování potřebuje datum, ne text — jinak stejný rozbalovací vzor jako NoteAction.
function ScheduleAction({ busy, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (!open) {
    return <Button variant="secondary" onClick={() => setOpen(true)}>Naplánovat</Button>;
  }
  return (
    <form
      className="ticket-note-form"
      onSubmit={(e) => { e.preventDefault(); onSubmit(value); setValue(''); setOpen(false); }}
    >
      <input
        type="date" className="input" value={value} autoFocus required
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="ticket-note-form__buttons">
        <Button type="button" variant="secondary" onClick={() => { setOpen(false); setValue(''); }}>Zrušit</Button>
        <Button type="submit" disabled={busy || !value}>Naplánovat</Button>
      </div>
    </form>
  );
}

export default function ChangeDetail({ id, onBack, onEdit }) {
  const { user } = useAuth();
  const { data: change, loading, error, reload } = useRow('changes', id, { mapRow: mapChange });
  const activityFilter = [Query.equal('change_id', id), Query.orderAsc('at')];
  const { rows: activity, reload: reloadActivity } = useTable('change_activity', { mapRow: mapActivity, filter: activityFilter });

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [assignableList, setAssignableList] = useState(null);

  useEffect(() => {
    callFn('tickets-fn', '/assignable', 'GET').then(setAssignableList).catch(() => setAssignableList([]));
  }, []);

  const runAction = async (path, body) => {
    setBusy(true);
    setActionError(null);
    try {
      await callFn('tickets-fn', `/changes/${id}/${path}`, 'POST', body);
      reload();
      reloadActivity();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setBusy(true);
    setActionError(null);
    try {
      await callFn('tickets-fn', `/changes/${id}/comments`, 'POST', { text });
      setCommentText('');
      reloadActivity();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const status = change?.status;
  const editable = canEdit(user);

  return (
    <>
      <button type="button" className="link-back" onClick={onBack}>← Zpět na přehled změn</button>
      <DataState loading={loading} error={error} onRetry={reload}>
        {change && (
          <>
            <div className="card ticket-head">
              <div>
                <div className="ticket-head__id">{change.id}</div>
                <h1 className="page-title">{change.title}</h1>
                <div className="ticket-head__badges">
                  <Badge type={changeBadge(change.status)}>{change.status}</Badge>
                  <Badge type={riskBadge(change.risk_level)}>{change.risk_level}</Badge>
                </div>
              </div>
              {editable && <Button variant="secondary" onClick={() => onEdit(change)}>Upravit</Button>}
            </div>

            <div className="card ticket-meta">
              <dl className="meta-grid">
                <div><dt>Typ změny</dt><dd>{change.type}</dd></div>
                <div><dt>Vlastník</dt><dd>{change.owner}</dd></div>
                <div><dt>Realizátor</dt><dd>{change.assigned_to_name ?? '— nepřiřazeno —'}</dd></div>
                <div><dt>Plánovaný termín</dt><dd>{change.planned_date ? isoToCz(change.planned_date) : '—'}</dd></div>
                <div><dt>Skutečný termín realizace</dt><dd>{change.implemented_date ? isoToCz(change.implemented_date) : '—'}</dd></div>
              </dl>
              {change.description && <p className="ticket-description">{change.description}</p>}
            </div>

            {editable && (
              <div className="card ticket-actions">
                <h2 className="section-title">Akce</h2>
                <div className="ticket-actions__row">
                  {CAN_ASSIGN_STATUSES.has(status) && (
                    <AssignControl
                      assignable={assignableList} currentId={change.assigned_to_user_id} busy={busy}
                      onAssign={(userId) => runAction('assign', { user_id: userId })}
                    />
                  )}
                  {status === 'Návrh' && (
                    <Button onClick={() => runAction('submit', {})} disabled={busy}>Odeslat ke schválení</Button>
                  )}
                  {status === 'Ke schválení' && (
                    <>
                      <Button onClick={() => runAction('approve', {})} disabled={busy}>Schválit</Button>
                      <NoteAction
                        label="Zamítnout" placeholder="Důvod zamítnutí…" required busy={busy}
                        onSubmit={(reason) => runAction('reject', { reason })}
                      />
                    </>
                  )}
                  {status === 'Schváleno' && (
                    <ScheduleAction busy={busy} onSubmit={(plannedDate) => runAction('schedule', { planned_date: plannedDate })} />
                  )}
                  {status === 'Naplánováno' && (
                    <Button onClick={() => runAction('implement', {})} disabled={busy}>Realizovat</Button>
                  )}
                  {status === 'Realizováno' && (
                    <Button onClick={() => runAction('close', {})} disabled={busy}>Uzavřít</Button>
                  )}
                  {(status === 'Uzavřeno' || status === 'Zamítnuto') && (
                    <NoteAction
                      label="Znovuotevřít" placeholder="Důvod znovuotevření…" required busy={busy}
                      onSubmit={(reason) => runAction('reopen', { reason })}
                    />
                  )}
                </div>
              </div>
            )}

            {actionError && <div className="form-error">{actionError}</div>}

            <div className="card ticket-timeline">
              <h2 className="section-title">Časová osa</h2>
              <ul className="timeline">
                {(activity ?? []).length === 0 && <li className="timeline__empty">Zatím žádná aktivita.</li>}
                {(activity ?? []).map((entry) => (
                  <li key={entry.id} className="timeline__item">
                    <div className="timeline__meta">
                      <span className="timeline__type">{ACTIVITY_TYPE_LABELS[entry.type] ?? entry.type}</span>
                      <span className="timeline__author">{entry.user_name}</span>
                      <span className="timeline__time">{isoDateTimeToCz(entry.at)}</span>
                    </div>
                    <div className="timeline__text">{activityLine(entry)}</div>
                  </li>
                ))}
              </ul>
              {editable && (
                <form className="comment-form" onSubmit={submitComment}>
                  <textarea
                    className="textarea" placeholder="Přidat poznámku…" value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button type="submit" variant="secondary" disabled={busy || !commentText.trim()}>Přidat poznámku</Button>
                </form>
              )}
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
