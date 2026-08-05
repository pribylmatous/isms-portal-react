import Button from './Button.jsx';

export default function PageHeader({ title, lead, buttonLabel, onButtonClick }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-lead">{lead}</p>
      </div>
      {buttonLabel && <Button onClick={onButtonClick}>{buttonLabel}</Button>}
    </div>
  );
}
