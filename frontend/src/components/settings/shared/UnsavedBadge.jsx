function UnsavedBadge({ show }) {
  if (!show) return null;
  return <span className="inline-block h-2 w-2 rounded-full bg-amber-400" title="Unsaved changes" />;
}

export default UnsavedBadge;
