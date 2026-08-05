export default function Button({ children, onClick, variant = 'primary', type = 'button', disabled = false }) {
  return (
    <button type={type} className={`btn btn--${variant}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
