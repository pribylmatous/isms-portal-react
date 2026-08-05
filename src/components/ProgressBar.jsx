export default function ProgressBar({ pct, color }) {
  return (
    <div className="progress__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
