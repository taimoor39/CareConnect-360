import { SEVERITY_COLORS, SEVERITY_LABELS } from '../../utils/auditHelpers.js';

function SeverityDot({ severity = 'info' }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: SEVERITY_COLORS[severity] || SEVERITY_COLORS.info }}
      title={SEVERITY_LABELS[severity] || SEVERITY_LABELS.info}
    />
  );
}

export default SeverityDot;
