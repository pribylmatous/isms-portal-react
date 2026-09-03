// Statická konfigurace UI. Veškerá data ISMS poskytuje Appwrite (viz lib/appwrite.js).

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Přehled' },
  { id: 'controls', label: 'Přílohy A – opatření' },
  { id: 'risks', label: 'Registr rizik' },
  { id: 'policies', label: 'Knihovna dokumentů' },
  { id: 'audits', label: 'Audity a nápravná opatření' },
  { id: 'deadlines', label: 'Nejbližší termíny' },
  { id: 'changes', label: 'Řízení změn' },
  { id: 'incidents', label: 'Řízení incidentů' },
  { id: 'training', label: 'Školení a povědomí' },
  { id: 'materials', label: 'Materiály a dokumenty ke studiu' },
  { id: 'audit-log', label: 'Auditní stopa', roles: ['manager'] },
  { id: 'users', label: 'Uživatelé', roles: ['manager'] },
];
