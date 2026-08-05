import Button from './Button.jsx';

// Obal pro sekce načítané z API — zobrazí načítání / chybu, jinak obsah.
export default function DataState({ loading, error, onRetry, children }) {
  if (loading) return <div className="data-state">Načítám data…</div>;
  if (error) {
    return (
      <div className="data-state data-state--error">
        <div>Nepodařilo se načíst data: {error}</div>
        <Button variant="secondary" onClick={onRetry}>Zkusit znovu</Button>
      </div>
    );
  }
  return children;
}
