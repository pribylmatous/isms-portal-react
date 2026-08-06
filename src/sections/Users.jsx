import { useState } from 'react';
import useApi from '../lib/useApi.js';
import { post, put } from '../lib/api.js';
import { useAuth, ROLE_LABELS } from '../lib/auth.jsx';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import DataState from '../components/DataState.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import PasswordField from '../components/PasswordField.jsx';

const ROLE_KEYS = ['reader', 'editor', 'manager'];

export default function Users() {
  const { user } = useAuth();
  const { data: users, loading, error, reload } = useApi('/api/users');
  const [modal, setModal] = useState(null); // null | { record: null } | { record }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const editing = modal?.record ?? null;
  const openModal = (record = null) => { setFormError(null); setModal({ record }); };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      username: fd.get('username'),
      name: fd.get('name'),
      title: fd.get('title'),
      email: fd.get('email'),
      role: fd.get('role'),
    };
    const password = fd.get('password');
    if (password) payload.password = password;
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await put(`/api/users/${editing.id}`, payload);
      else await post('/api/users', payload);
      setModal(null);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    const verb = u.active ? 'deaktivovat' : 'aktivovat';
    if (!window.confirm(`Opravdu ${verb} účet „${u.name}"?`)) return;
    try {
      await put(`/api/users/${u.id}`, { active: !u.active });
      reload();
    } catch (err) {
      window.alert(`Akce se nezdařila: ${err.message}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Uživatelé"
        lead="Správa účtů a rolí portálu."
        buttonLabel="Nový uživatel"
        onButtonClick={() => openModal()}
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col /><col style={{ width: 150 }} /><col style={{ width: 200 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 170 }} />
            </colgroup>
            <thead>
              <tr><th>Jméno</th><th>Uživatelské jméno</th><th>E-mail</th><th>Role</th><th>Stav</th><th></th></tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} style={!u.active ? { opacity: .55 } : undefined}>
                  <td>
                    <div className="cell-strong">{u.name}</div>
                    <div className="cell-sub">{u.title}</div>
                  </td>
                  <td className="cell-muted">{u.username}</td>
                  <td className="cell-muted">{u.email ?? '—'}</td>
                  <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td><Badge type={u.active ? 'success' : 'neutral'}>{u.active ? 'Aktivní' : 'Deaktivovaný'}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="secondary" onClick={() => openModal(u)}>Upravit</Button>
                      {u.id !== user.id && (
                        <Button variant="secondary" onClick={() => toggleActive(u)}>
                          {u.active ? 'Deaktivovat' : 'Aktivovat'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {modal && (
        <Modal key={editing?.id ?? 'new'} title={editing ? `Upravit uživatele: ${editing.name}` : 'Nový uživatel'} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={submit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="user-name">Jméno</label>
                <input id="user-name" name="name" className="input" required defaultValue={editing?.name ?? ''} />
              </div>
              <div className="field">
                <label htmlFor="user-username">Uživatelské jméno</label>
                <input id="user-username" name="username" className="input" required defaultValue={editing?.username ?? ''} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="user-title">Pracovní pozice</label>
                <input id="user-title" name="title" className="input" defaultValue={editing?.title ?? ''} />
              </div>
              <div className="field">
                <label htmlFor="user-email">E-mail</label>
                <input id="user-email" name="email" type="email" className="input" defaultValue={editing?.email ?? ''} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="user-role">Role</label>
              <select id="user-role" name="role" className="select" defaultValue={editing?.role ?? 'reader'}>
                {ROLE_KEYS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="user-password">{editing ? 'Nové heslo' : 'Heslo'}</label>
              <PasswordField
                id="user-password" name="password" minLength={8}
                required={!editing} placeholder={editing ? 'Ponechte prázdné pro zachování hesla' : 'Alespoň 8 znaků'}
                autoComplete="new-password"
              />
            </div>
            {formError && <div className="form-error">{formError}</div>}
            <div className="modal__actions">
              <Button variant="secondary" onClick={() => setModal(null)}>Zrušit</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Ukládám…' : editing ? 'Uložit změny' : 'Vytvořit uživatele'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
