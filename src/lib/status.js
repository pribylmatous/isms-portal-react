// Mapování stavů na varianty badge a barvy — odpovídá logice návrhu (renderVals()).

export const statusBadge = (status) =>
  status === 'Zavedeno' ? 'success' : status === 'Částečně zavedeno' ? 'warning' : 'alert';

export const riskBadge = (level) =>
  level === 'Nízké' ? 'success' : level === 'Střední' ? 'warning' : 'alert';

export const auditBadge = (status) =>
  status === 'Uzavřeno' ? 'success'
    : status === 'V řešení' ? 'warning'
      : status === 'Po termínu' ? 'alert'
        : 'neutral';

export const policyBadge = (status) =>
  status === 'Schváleno' ? 'success' : status === 'K revizi' ? 'warning' : 'neutral';

export const changeBadge = (status) =>
  status === 'Realizováno' || status === 'Uzavřeno' ? 'success'
    : status === 'Zamítnuto' ? 'alert'
      : status === 'Návrh' ? 'neutral'
        : 'warning'; // Ke schválení, Schváleno, Naplánováno

export const incidentBadge = (status) =>
  status === 'Vyřešeno' || status === 'Uzavřeno' ? 'success'
    : status === 'Eskalováno' || status === 'Pozastaveno' ? 'alert'
      : status === 'V řešení' ? 'warning'
        : status === 'Přiřazeno' ? 'default'
          : 'neutral'; // Nové

export const priorityBadge = (priority) =>
  priority === 'Kritická' ? 'alert' : priority === 'Vysoká' ? 'warning' : priority === 'Střední' ? 'default' : 'success'; // Nízká

export const domainColor = (pct) =>
  pct >= 80 ? 'var(--status-ok)' : pct >= 60 ? 'var(--status-warn)' : 'var(--status-danger)';

export const trainingColor = (pct) =>
  pct >= 90 ? 'var(--status-ok)' : pct >= 60 ? 'var(--status-warn)' : 'var(--status-danger)';

export const riskColor = (level) =>
  level === 'Vysoké' ? 'var(--status-danger)' : level === 'Střední' ? 'var(--status-warn)' : 'var(--status-ok)';

export const auditDateColor = (status) =>
  status === 'Uzavřeno' ? 'var(--status-ok)'
    : status === 'Po termínu' ? 'var(--status-danger)'
      : status === 'V řešení' ? 'var(--status-warn)'
        : 'var(--color-neutral-800)';

// Termín přezkoumání opatření — stejná 30denní hranice jako upozornění na
// dashboardu (GET /api/dashboard, "review_due <= +30 dnů"), jen tady navíc
// rozlišuje už prošlý termín (danger) od blížícího se (warn), aby šlo
// v katalogu na první pohled poznat, o která konkrétní opatření jde.
export const reviewDueSeverity = (reviewDue) => {
  if (!reviewDue) return 'neutral';
  const today = new Date().toISOString().slice(0, 10);
  if (reviewDue < today) return 'danger';
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return reviewDue <= in30 ? 'warn' : 'neutral';
};

// Pořadí a popisky domén přílohy A pro dashboard
export const DOMAIN_LABELS = {
  'Organizační': 'Organizační opatření (A.5)',
  'Lidské zdroje': 'Opatření pro lidské zdroje (A.6)',
  'Fyzická bezpečnost': 'Fyzická bezpečnost (A.7)',
  'Technologická': 'Technologická bezpečnost (A.8)',
};

export const DEADLINE_TONES = {
  neutral: 'var(--color-neutral-800)',
  warn: 'var(--status-warn)',
  danger: 'var(--status-danger)',
};
