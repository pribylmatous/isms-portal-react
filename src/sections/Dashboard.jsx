import useApi from '../lib/useApi.js';
import { DOMAIN_LABELS, DEADLINE_TONES, domainColor } from '../lib/status.js';
import { isoToCz, todayCz } from '../lib/utils.js';
import DataState from '../components/DataState.jsx';
import ProgressBar from '../components/ProgressBar.jsx';

const ALERT_CLASS = { warn: 'alert--warning', danger: 'alert--danger' };

export default function Dashboard() {
  const { data, loading, error, reload } = useApi('/api/dashboard');

  return (
    <>
      <h1 className="page-title">Přehled shody ISMS</h1>
      <p className="page-lead">
        Stav řízení bezpečnosti informací dle ISO/IEC 27001:2022. Aktualizováno {todayCz()}.
      </p>

      <DataState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <div className="kpi-grid">
              <div className="card kpi">
                <div className="kpi__label">Celková shoda ISMS</div>
                <div className="kpi__value" style={{ color: 'var(--color-primary-600)' }}>
                  {data.compliance.overallPct} %
                </div>
                <div className="kpi__sub">cíl do konce roku: {data.compliance.targetPct} %</div>
              </div>
              <div className="card kpi">
                <div className="kpi__label">Otevřená rizika</div>
                <div className="kpi__value" style={{ color: 'var(--color-neutral-1000)' }}>
                  {data.risks.open}
                </div>
                <div className="kpi__sub">
                  {data.risks.high === 0 ? 'žádné s vysokou prioritou' : `${data.risks.high} s vysokou prioritou`}
                </div>
              </div>
              <div className="card kpi">
                <div className="kpi__label">Nápravná opatření po termínu</div>
                <div
                  className="kpi__value"
                  style={{ color: data.findings.overdue > 0 ? 'var(--status-danger)' : 'var(--status-ok)' }}
                >
                  {data.findings.overdue}
                </div>
                <div className="kpi__sub">
                  {data.findings.overdue > 0 ? 'vyžaduje okamžitou pozornost' : 'vše v termínu'}
                </div>
              </div>
              <div className="card kpi">
                <div className="kpi__label">Příští recertifikační audit</div>
                <div className="kpi__value" style={{ color: 'var(--color-neutral-1000)' }}>
                  {isoToCz(data.nextAudit.date)}
                </div>
                <div className="kpi__sub">externí auditor: {data.nextAudit.auditor}</div>
              </div>
            </div>

            {data.alerts.length > 0 && (
              <div className="alerts">
                {data.alerts.map((a) => (
                  <div key={a.text} className={`alert ${ALERT_CLASS[a.severity] ?? 'alert--warning'}`} role="status">
                    <span className="alert__dot" />
                    <span className="alert__text">{a.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="dashboard-cols">
              <section>
                <h2 className="section-title">Shoda podle domény příloh A</h2>
                <div className="progress-list">
                  {Object.keys(DOMAIN_LABELS).map((domain) => {
                    const d = data.compliance.byDomain.find((x) => x.domain === domain);
                    if (!d) return null;
                    return (
                      <div key={domain}>
                        <div className="progress__head">
                          <span className="progress__name">{DOMAIN_LABELS[domain]}</span>
                          <span className="progress__pct">{d.pct}%</span>
                        </div>
                        <ProgressBar pct={d.pct} color={domainColor(d.pct)} />
                      </div>
                    );
                  })}
                </div>
              </section>
              <section>
                <h2 className="section-title">Nejbližší termíny</h2>
                <div className="card deadlines">
                  {data.deadlines.map((dl) => (
                    <div key={dl.id} className="deadline">
                      <div>
                        <div className="deadline__title">{dl.title}</div>
                        <div className="deadline__owner">{dl.owner}</div>
                      </div>
                      <div className="deadline__date" style={{ color: DEADLINE_TONES[dl.severity] }}>
                        {isoToCz(dl.due)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
