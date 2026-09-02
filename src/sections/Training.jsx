import { useEffect, useState } from 'react';
import useApi from '../lib/useApi.js';
import { get, post, put, del } from '../lib/api.js';
import { useAuth, isManager, ROLE_LABELS } from '../lib/auth.jsx';
import { trainingColor } from '../lib/status.js';
import { isoToCz, isoDateTimeToCz } from '../lib/utils.js';
import DataState from '../components/DataState.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import Accordion from '../components/Accordion.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RowActions from '../components/RowActions.jsx';

// Osobní stav absolvování — jen pro školení s kvízem (t.hasQuiz)
const myStatusBadge = (myCompletion) => {
  if (!myCompletion) return { type: 'neutral', label: 'Vy: nezahájeno' };
  if (myCompletion.passed) return { type: 'success', label: `Vy: absolvováno (${myCompletion.score} %)` };
  return { type: 'alert', label: `Vy: nesplněno (${myCompletion.score} %) – zkuste znovu` };
};

function Quiz({ trainingId, onDone, onClose }) {
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    get(`/api/trainings/${trainingId}/quiz`).then(setQuiz).catch((err) => setError(err.message));
  }, [trainingId]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = quiz.questions.map((_, i) => answers[i] ?? -1);
      setResult(await post(`/api/trainings/${trainingId}/complete`, { answers: payload }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !quiz) return <div className="form-error">{error}</div>;
  if (!quiz) return <div>Načítám kvíz…</div>;

  if (result) {
    return (
      <div>
        <p style={{ fontSize: 15, marginBottom: 8 }}>
          Výsledek: <strong>{result.score} %</strong> ({result.correctCount} z {result.total} správně)
        </p>
        <Badge type={result.passed ? 'success' : 'alert'}>
          {result.passed ? 'Školení absolvováno' : `Nesplněno – potřeba alespoň ${result.threshold} %`}
        </Badge>
        <div className="modal__actions" style={{ marginTop: 20 }}>
          <Button onClick={() => { onDone(); onClose(); }}>Zavřít</Button>
        </div>
      </div>
    );
  }

  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  return (
    <form className="form-grid" onSubmit={submit}>
      {quiz.questions.map((q, qi) => (
        <div className="field" key={qi}>
          <label>{qi + 1}. {q.q}</label>
          {q.options.map((opt, oi) => (
            <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, padding: '4px 0' }}>
              <input
                type="radio"
                name={`q${qi}`}
                checked={answers[qi] === oi}
                onChange={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
              />
              {opt}
            </label>
          ))}
        </div>
      ))}
      {error && <div className="form-error">{error}</div>}
      <div className="modal__actions">
        <Button variant="secondary" onClick={onClose}>Zrušit</Button>
        <Button type="submit" disabled={!allAnswered || submitting}>{submitting ? 'Vyhodnocuji…' : 'Odeslat'}</Button>
      </div>
    </form>
  );
}

const emptyQuestion = () => ({ q: '', options: ['', ''], correct: 0 });
const ROLE_KEYS = ['reader', 'editor', 'manager'];

function QuestionEditor({ qIndex, question, onChange, onRemove, canRemove }) {
  const setField = (patch) => onChange({ ...question, ...patch });
  const setOption = (i, value) => {
    const options = [...question.options];
    options[i] = value;
    setField({ options });
  };
  const addOption = () => setField({ options: [...question.options, ''] });
  const removeOption = (i) => {
    const options = question.options.filter((_, idx) => idx !== i);
    setField({ options, correct: question.correct >= options.length ? 0 : question.correct });
  };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div className="field">
        <label htmlFor={`q${qIndex}-text`}>Otázka {qIndex + 1}</label>
        <input
          id={`q${qIndex}-text`} className="input" required value={question.q}
          onChange={(e) => setField({ q: e.target.value })}
        />
      </div>
      <div className="form-hint" style={{ marginBottom: 4 }}>Označte rádiem správnou odpověď.</div>
      {question.options.map((opt, oi) => (
        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input
            type="radio" name={`q${qIndex}-correct`} checked={question.correct === oi}
            onChange={() => setField({ correct: oi })} aria-label={`Možnost ${oi + 1} je správná`}
          />
          <input
            className="input" style={{ flex: 1 }} required value={opt}
            placeholder={`Možnost ${oi + 1}`} onChange={(e) => setOption(oi, e.target.value)}
          />
          {question.options.length > 2 && (
            <Button variant="secondary" onClick={() => removeOption(oi)}>Odebrat</Button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {question.options.length < 6
          ? <Button variant="secondary" onClick={addOption}>+ Možnost</Button>
          : <span />}
        {canRemove && <Button variant="secondary" onClick={onRemove}>Odebrat otázku</Button>}
      </div>
    </div>
  );
}

function TrainingAdminModal({ initial, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name ?? '');
  const [targetRoles, setTargetRoles] = useState(initial?.targetRoles ?? ROLE_KEYS);
  const [due, setDue] = useState(initial?.due ?? '');
  const [questions, setQuestions] = useState(initial?.questions?.length ? initial.questions : [emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleRole = (role) => setTargetRoles((rs) => (rs.includes(role) ? rs.filter((r) => r !== role) : [...rs, role]));
  const updateQuestion = (i, next) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? next : q)));
  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { name, target_roles: targetRoles, due, questions };
      if (editing) await put(`/api/trainings/${initial.id}`, payload);
      else await post('/api/trainings', payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? `Upravit školení: ${initial.name}` : 'Nové školení'} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="field">
          <label htmlFor="tr-name">Název školení</label>
          <input id="tr-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
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
            <label htmlFor="tr-due">Termín</label>
            <input id="tr-due" type="date" className="input" required value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>

        <h2 className="section-title" style={{ marginTop: 4 }}>Otázky testu</h2>
        {questions.map((q, i) => (
          <QuestionEditor
            key={i} qIndex={i} question={q}
            onChange={(next) => updateQuestion(i, next)}
            onRemove={() => removeQuestion(i)}
            canRemove={questions.length > 1}
          />
        ))}
        <Button variant="secondary" onClick={addQuestion}>+ Přidat otázku</Button>

        {error && <div className="form-error">{error}</div>}
        <div className="modal__actions">
          <Button variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button type="submit" disabled={saving || targetRoles.length === 0}>{saving ? 'Ukládám…' : 'Uložit'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RosterModal({ training, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    get(`/api/trainings/${training.id}/completions`).then(setRows).catch((err) => setError(err.message));
  }, [training.id]);

  return (
    <Modal title={`Výsledky: ${training.name}`} onClose={onClose}>
      {error && <div className="form-error">{error}</div>}
      {!rows && !error && <div>Načítám…</div>}
      {rows && (
        <table className="table">
          <thead><tr><th>Uživatel</th><th>Role</th><th>Stav</th><th>Skóre</th><th>Absolvováno</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId}>
                <td>{r.name}</td>
                <td className="cell-muted">{ROLE_LABELS[r.role] ?? r.role}</td>
                <td>
                  {r.passed === null
                    ? <Badge type="neutral">Nezahájeno</Badge>
                    : r.passed
                      ? <Badge type="success">Absolvováno</Badge>
                      : <Badge type="alert">Nesplněno</Badge>}
                </td>
                <td className="cell-muted">{r.score ?? '—'}</td>
                <td className="cell-muted">{r.completedAt ? isoDateTimeToCz(r.completedAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}

export default function Training() {
  const { user } = useAuth();
  const manager = isManager(user);
  const trainings = useApi('/api/trainings');
  const faqs = useApi('/api/faqs');
  const [openFaq, setOpenFaq] = useState(0);
  const [quizTraining, setQuizTraining] = useState(null); // null | training
  const [adminModal, setAdminModal] = useState(null); // null | { initial: null | fullRecord }
  const [rosterTraining, setRosterTraining] = useState(null); // null | training

  const loading = trainings.loading || faqs.loading;
  const error = trainings.error ?? faqs.error;
  const reload = () => { trainings.reload(); faqs.reload(); };

  const openEdit = async (t) => {
    try {
      const full = await get(`/api/trainings/${t.id}`);
      setAdminModal({ initial: full });
    } catch (err) {
      window.alert(`Nepodařilo se načíst školení: ${err.message}`);
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Opravdu smazat školení „${t.name}"? Smažou se i výsledky uživatelů.`)) return;
    try {
      await del(`/api/trainings/${t.id}`);
      reload();
    } catch (err) {
      window.alert(`Smazání se nezdařilo: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Školení a bezpečnostní povědomí"
        lead="Povinná školení zaměstnanců k ochraně informací a plnění požadavků A.6.3."
        buttonLabel={manager ? 'Nové školení' : undefined}
        onButtonClick={() => setAdminModal({ initial: null })}
      />

      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card-grid-3" style={{ marginBottom: 32 }}>
          {(trainings.data ?? []).map((t) => {
            const mine = t.hasQuiz ? myStatusBadge(t.myCompletion) : null;
            return (
              <div key={t.id} className="card training">
                <div className="training__name">{t.name}</div>
                <div className="training__meta">{t.audience} &middot; termín {isoToCz(t.due)}</div>
                <ProgressBar pct={t.pct} color={trainingColor(t.pct)} />
                <div className="training__stats"><span>Dokončeno</span><strong>{t.pct}%</strong></div>
                {t.hasQuiz && (
                  <>
                    <Badge type={mine.type}>{mine.label}</Badge>
                    <Button variant="secondary" onClick={() => setQuizTraining(t)}>
                      {t.myCompletion ? 'Opakovat školení' : 'Spustit školení'}
                    </Button>
                  </>
                )}
                {manager && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Button variant="secondary" onClick={() => setRosterTraining(t)}>Výsledky uživatelů</Button>
                    <RowActions onEdit={() => openEdit(t)} onDelete={() => remove(t)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="section-title">Nejčastější dotazy</h2>
        <div className="faq-list">
          {(faqs.data ?? []).map((f, i) => (
            <Accordion
              key={f.id}
              id={f.id}
              label={f.question}
              open={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
            >
              {f.answer}
            </Accordion>
          ))}
        </div>
      </DataState>

      {quizTraining && (
        <Modal title={quizTraining.name} onClose={() => setQuizTraining(null)}>
          <Quiz trainingId={quizTraining.id} onDone={reload} onClose={() => setQuizTraining(null)} />
        </Modal>
      )}

      {adminModal && (
        <TrainingAdminModal
          initial={adminModal.initial}
          onClose={() => setAdminModal(null)}
          onSaved={reload}
        />
      )}

      {rosterTraining && (
        <RosterModal training={rosterTraining} onClose={() => setRosterTraining(null)} />
      )}
    </>
  );
}
