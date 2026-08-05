import { useState } from 'react';
import useApi from '../lib/useApi.js';
import { isoDateTimeToCz } from '../lib/utils.js';
import Badge from '../components/Badge.jsx';
import DataState from '../components/DataState.jsx';
import PageHeader from '../components/PageHeader.jsx';

const ENTITY_FILTERS = [
  ['all', 'Vše'],
  ['control', 'Opatření'],
  ['risk', 'Rizika'],
  ['policy', 'Dokumenty'],
  ['finding', 'Zjištění'],
];

const ENTITY_LABELS = { control: 'Opatření', risk: 'Riziko', policy: 'Dokument', finding: 'Zjištění' };

const ACTION_BADGE = { create: 'success', update: 'warning', delete: 'alert' };
const ACTION_LABELS = { create: 'Vytvořeno', update: 'Upraveno', delete: 'Smazáno' };

const FIELD_LABELS = {
  name: 'Název', asset: 'Aktivum', probability: 'Pravděpodobnost', impact: 'Dopad', score: 'Skóre',
  level: 'Úroveň', owner: 'Vlastník', treatment: 'Ošetření', status: 'Stav', category: 'Kategorie',
  version: 'Verze', finding: 'Zjištění', type: 'Typ', due: 'Termín', domain: 'Doména',
  review_due: 'Termín přezkoumání', file_name: 'Soubor', file_size: 'Velikost souboru (B)', file_mime: 'Typ souboru',
};

const fieldLabel = (key) => FIELD_LABELS[key] ?? key;
const fieldValue = (v) => (v === null || v === '' ? '—' : String(v));

export default function AuditLog() {
  const [filter, setFilter] = useState('all');
  const { data: entries, loading, error, reload } = useApi(
    '/api/audit-log' + (filter === 'all' ? '' : `?entity=${filter}`),
  );

  return (
    <>
      <PageHeader
        title="Auditní stopa"
        lead="Kompletní historie změn napříč rejstříky ISMS — kdo, co a kdy upravil."
      />
      <div className="filter-bar">
        <div className="filter-chips">
          {ENTITY_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`chip${filter === value ? ' is-active' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <DataState loading={loading} error={error} onRetry={reload}>
        <div className="card table-card">
          <table className="table">
            <colgroup>
              <col style={{ width: 140 }} /><col style={{ width: 150 }} /><col style={{ width: 110 }} />
              <col style={{ width: 90 }} /><col /><col />
            </colgroup>
            <thead>
              <tr><th>Datum a čas</th><th>Uživatel</th><th>Entita</th><th>Akce</th><th>Popis</th><th>Změny</th></tr>
            </thead>
            <tbody>
              {(entries ?? []).map((e) => (
                <tr key={e.id}>
                  <td className="cell-muted">{isoDateTimeToCz(e.at)}</td>
                  <td>{e.user_name ?? '—'}</td>
                  <td className="cell-muted">{ENTITY_LABELS[e.entity] ?? e.entity} <span className="cell-sub">{e.entity_id}</span></td>
                  <td><Badge type={ACTION_BADGE[e.action] ?? 'default'}>{ACTION_LABELS[e.action] ?? e.action}</Badge></td>
                  <td>{e.label ?? '—'}</td>
                  <td className="cell-muted">
                    {e.changes
                      ? Object.entries(e.changes).map(([field, [oldVal, newVal]]) => (
                        <div key={field}>{fieldLabel(field)}: {fieldValue(oldVal)} → {fieldValue(newVal)}</div>
                      ))
                      : '—'}
                  </td>
                </tr>
              ))}
              {entries?.length === 0 && (
                <tr><td colSpan={6} className="cell-muted">Žádné záznamy neodpovídají filtru.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  );
}
