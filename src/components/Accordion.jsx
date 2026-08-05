export default function Accordion({ id, label, open, onToggle, children }) {
  return (
    <div className="faq">
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          className="accordion"
          aria-expanded={open}
          aria-controls={`faq-panel-${id}`}
          onClick={onToggle}
        >
          <span>{label}</span>
          <svg className="accordion__chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2.5 5.5 8 11l5.5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </h3>
      <div className="faq__answer" id={`faq-panel-${id}`} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
