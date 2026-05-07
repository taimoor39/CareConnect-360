import { ACTION_ICONS, formatAction, getActionCategory } from '../../utils/auditHelpers.js';

function ActionBadge({ action }) {
  const category = getActionCategory(action);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal-300/30 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-100">
      <span>{ACTION_ICONS[category] || ACTION_ICONS.system}</span>
      <span>{formatAction(action)}</span>
    </span>
  );
}

export default ActionBadge;
