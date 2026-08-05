// Statická konfigurace UI. Veškerá data ISMS poskytuje API (viz lib/api.js).

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Přehled' },
  { id: 'controls', label: 'Přílohy A – opatření' },
  { id: 'risks', label: 'Registr rizik' },
  { id: 'policies', label: 'Knihovna dokumentů' },
  { id: 'audits', label: 'Audity a nápravná opatření' },
  { id: 'changes', label: 'Řízení změn' },
  { id: 'incidents', label: 'Řízení incidentů' },
  { id: 'training', label: 'Školení a povědomí' },
  { id: 'audit-log', label: 'Auditní stopa', roles: ['manager'] },
  { id: 'users', label: 'Uživatelé', roles: ['manager'] },
];
