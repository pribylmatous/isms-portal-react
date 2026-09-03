import { useEffect, useState } from 'react';
import { Query } from 'appwrite';
import useRow from '../lib/useRow.js';
import useTable from '../lib/useTable.js';
import { callFn } from '../lib/fn.js';
import { useAuth, canEdit } from '../lib/auth.jsx';
import { incidentBadge, priorityBadge } from '../lib/status.js';
import { isoToCz, isoDateTimeToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';

// Stavy, ve kterých má smysl (pře)přiřadit řešitele — ne po vyřešení/uzavření.
const CAN_ASSIGN_STATUSES = new Set(['Nové', 'Přiřazeno', 'V řešení', 'Pozastaveno', 'Eskalováno']);

const ACTIVITY_TYPE_LABELS = { status_change: 'Stav', assignment: 'Přiřazení', comment: 'Poznámka' };

const mapIncident = (r) => ({
  id: r.$id, title: r.title, description: r.description, category: r.category, priority: r.priority,
  status: r.status, reported_by: r.reported_by, owner: r.owner, occurred_at: r.occurred_at,
  resolved_at: r.resolved_at, resolution: r.resolution, assigned_to_user_id: r.assigned_to_user_id, assigned_to_name: r.assigned_to_name,
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
        <option value="" disabled>Vyberte řešitele…</option>
        {(assignable ?? []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <Button type="submit" variant="secondary" disabled={busy || !value}>
        {currentId ? 'Přeřadit' : 'Přiřadit řešiteli'}
      </Button>
    </form>
  );
}

// Akce, co ke svému provedení potřebují text (důvod pozastavení, řešení, …) —
// tlačítko po kliknutí rozbalí formulář místo okamžitého volání API.
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

export default function IncidentDetail({ id, onBack, onEdit }) {
  const { user } = useAuth();
  const { data: incident, loading, error, reload } = useRow('incidents', id, { mapRow: mapIncident });
  const activityFilter = [Query.equal('incident_id', id), Query.orderAsc('at')];
  const { rows: activity, reload: reloadActivity } = useTable('incident_activity', { mapRow: mapActivity, filter: activityFilter });

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
      await callFn('tickets-fn', `/incidents/${id}/${path}`, 'POST', body);
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
      await callFn('tickets-fn', `/incidents/${id}/comments`, 'POST', { text });
      setCommentText('');
      reloadActivity();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const status = incident?.status;
  const editable = canEdit(user);

  return (
    <>
      <button type="button" className="link-back" onClick={onBack}>← Zpět na přehled incidentů</button>
      <DataState loading={loading} error={error} onRetry={reload}>
        {incident && (
          <>
            <div className="card ticket-head">
              <div>
                <div className="ticket-head__id">{incident.id}</div>
                <h1 className="page-title">{incident.title}</h1>
                <div className="ticket-head__badges">
                  <Badge type={incidentBadge(incident.status)}>{incident.status}</Badge>
                  <Badge type={priorityBadge(incident.priority)}>{incident.priority}</Badge>
                </div>
              </div>
              {editable && <Button variant="secondary" onClick={() => onEdit(incident)}>Upravit</Button>}
            </div>

            <div className="card ticket-meta">
              <dl className="meta-grid">
                <div><dt>Kategorie</dt><dd>{incident.category}</dd></div>
                <div><dt>Nahlásil</dt><dd>{incident.reported_by}</dd></div>
                <div><dt>Vlastník</dt><dd>{incident.owner}</dd></div>
                <div><dt>Řešitel</dt><dd>{incident.assigned_to_name ?? '— nepřiřazeno —'}</dd></div>
                <div><dt>Vznik</dt><dd>{isoToCz(incident.occurred_at)}</dd></div>
                <div><dt>Vyřešeno</dt><dd>{incident.resolved_at ? isoToCz(incident.resolved_at) : '—'}</dd></div>
              </dl>
              {incident.description && <p className="ticket-description">{incident.description}</p>}
              {incident.resolution && (
                <div className="ticket-resolution">
                  <div className="ticket-resolution__label">Řešení / kořenová příčina</div>
                  <p>{incident.resolution}</p>
                </div>
              )}
            </div>

            {editable && (
              <div className="card ticket-actions">
                <h2 className="section-title">Akce</h2>
                <div className="ticket-actions__row">
                  {CAN_ASSIGN_STATUSES.has(status) && (
                    <AssignControl
                      assignable={assignableList} currentId={incident.assigned_to_user_id} busy={busy}
                      onAssign={(userId) => runAction('assign', { user_id: userId })}
                    />
                  )}
                  {status === 'Přiřazeno' && (
                    <Button onClick={() => runAction('start', {})} disabled={busy}>Začít řešit</Button>
                  )}
                  {status === 'V řešení' && (
                    <NoteAction
                      label="Pozastavit" placeholder="Důvod pozastavení…" required busy={busy}
                      onSubmit={(reason) => runAction('pause', { reason })}
                    />
                  )}
                  {status === 'Pozastaveno' && (
                    <Button onClick={() => runAction('resume', {})} disabled={busy}>Obnovit řešení</Button>
                  )}
                  {(status === 'V řešení' || status === 'Pozastaveno') && (
                    <NoteAction
                      label="Eskalovat" placeholder="Poznámka k eskalaci (nepovinné)…" busy={busy}
                      onSubmit={(note) => runAction('escalate', { note: note || undefined })}
                    />
                  )}
                  {(status === 'V řešení' || status === 'Eskalováno') && (
                    <NoteAction
                      label="Vyřešit" placeholder="Řešení / kořenová příčina…" required busy={busy}
                      onSubmit={(resolution) => runAction('resolve', { resolution })}
                    />
                  )}
                  {status === 'Vyřešeno' && (
                    <Button onClick={() => runAction('close', {})} disabled={busy}>Uzavřít</Button>
                  )}
                  {(status === 'Vyřešeno' || status === 'Uzavřeno') && (
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
