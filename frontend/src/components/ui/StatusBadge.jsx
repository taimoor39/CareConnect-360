function StatusBadge({ label = 'Live', className = '' }) {
  return (
    <span className={`care-live-badge ${className}`.trim()}>
      {label}
    </span>
  );
}

export default StatusBadge;
