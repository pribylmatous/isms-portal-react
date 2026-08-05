export default function Badge({ type = 'default', children }) {
  return <span className={`badge badge--${type}`}>{children}</span>;
}
