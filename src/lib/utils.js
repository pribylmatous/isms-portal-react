// '2026-08-15' (ISO z API / input type=date) → '15.08.2026'
export function isoToCz(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

// Dnešní datum jako '28.07.2026'
export function todayCz() {
  return isoToCz(new Date().toISOString());
}

// '2026-08-15T14:03:27.123Z' (new Date().toISOString(), jak appka časová razítka
// vždy generuje) → '15.08.2026 14:03'. Rozdělovač může být 'T' i mezera (starší
// SQLite formát), proto regex místo prostého split(' ').
export function isoDateTimeToCz(dt) {
  if (!dt) return '';
  const [datePart, timePart] = dt.split(/[T ]/);
  return `${isoToCz(datePart)} ${(timePart ?? '').slice(0, 5)}`;
}
