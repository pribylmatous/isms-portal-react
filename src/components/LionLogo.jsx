// Zjednodušený znak (lev) — v produkci nahradit oficiálním logem
// dle manuálu jednotného vizuálního stylu.
export default function LionLogo() {
  return (
    <svg className="header__logo" viewBox="0 0 28 36" role="img" aria-label="Státní znak – lev">
      <rect width="28" height="36" rx="3" style={{ fill: 'var(--color-primary-600)' }} />
      <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 6.5l1.5-2 1.5 2 1.5-2 1 2.5" />
        <path d="M18 9.5c1.5-1 3.5-.5 4 1 .4 1.3-.3 2.5-1.5 3" />
        <path d="M20 13.5c-1 3-3.5 5.5-6.5 7.5-1.5 1-2.5 2.5-2.5 4.5v5" />
        <path d="M14.5 17.5L9 13.5M12.5 20.5L7.5 17" />
        <path d="M16 30.5v-4.5" />
        <path d="M13 25.5c2.5 1 5.5.5 7-1.5 1-1.3 1-3 .2-4.5" />
        <path d="M14.5 28c3 .8 6.5-.5 8-3.5" />
      </g>
    </svg>
  );
}
