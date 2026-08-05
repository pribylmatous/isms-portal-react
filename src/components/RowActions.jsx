// Akční ikonky pro řádek tabulky / kartu: upravit, smazat.

function IconButton({ label, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      className={`icon-btn${danger ? ' icon-btn--danger' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const pencil = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M11.3 1.6l3.1 3.1L5.2 13.9l-3.9 1 .9-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

const trash = (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M2.5 4h11M6 4V2.8a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8V4M4 4l.7 9.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8L12 4M6.5 7v4.5M9.5 7v4.5"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

export default function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      {onEdit && <IconButton label="Upravit" onClick={onEdit}>{pencil}</IconButton>}
      {onDelete && <IconButton label="Smazat" danger onClick={onDelete}>{trash}</IconButton>}
    </div>
  );
}
