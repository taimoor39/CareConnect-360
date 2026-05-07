import { useEffect, useMemo, useState } from 'react';

const termPairs = [
  ['hypertension', 'high blood pressure'],
  ['tachycardia', 'fast heart rate'],
  ['myocardial ischemia', 'reduced blood flow'],
  ['renal insufficiency', 'kidney problems'],
  ['hepatomegaly', 'enlarged liver'],
];

function statusBadge(status) {
  if (status === 'Approved') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'Pending Approval') return 'bg-amber-500/20 text-amber-200';
  if (status === 'Rejected') return 'bg-rose-500/20 text-rose-200';
  if (status === 'Generating') return 'bg-sky-500/20 text-sky-200';
  return 'bg-slate-700 text-slate-200';
}

function AISummaryReview({
  report,
  summary,
  generating,
  onGenerate,
  onRejectRegenerate,
  onApprove,
  aiUnavailableBanner,
  onDismissBanner,
}) {
  const [edited, setEdited] = useState(() => String(summary?.simplifiedSummary ?? ''));

  // `useState` only uses the initial value on first mount. When generation finishes,
  // `summary` arrives/updates from the parent but local `edited` would stay stale (often empty).
  useEffect(() => {
    setEdited(String(summary?.simplifiedSummary ?? ''));
  }, [summary?._id, summary?.simplifiedSummary]);

  const status = generating ? 'Generating' : (summary?.status || 'Not Generated');

  const simplifiedTerms = useMemo(() => {
    const raw = String(report?.originalText || '').toLowerCase();
    return termPairs.filter(([src, dst]) => raw.includes(src) && String(edited).toLowerCase().includes(dst));
  }, [report?.originalText, edited]);

  const generationSeconds = ((summary?.generationTimeMs || 0) / 1000).toFixed(1);

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">AI Summary</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs ${statusBadge(status)}`}>
          {status === 'Pending Approval' ? 'Generated — Pending Your Approval' : status === 'Generating' ? 'Generating...' : status}
        </span>
      </div>

      {aiUnavailableBanner ? (
        <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-100">
          ⚠️ AI summarization is temporarily unavailable. The original report has been saved and you can generate a summary when the service is restored.
          <button type="button" onClick={onDismissBanner} className="ml-3 underline">Dismiss</button>
        </div>
      ) : null}

      {!summary ? (
        <button type="button" disabled={generating} onClick={onGenerate} className="rounded-md border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          {generating ? 'Generating summary...' : 'Generate Summary'}
        </button>
      ) : (
        <>
          <label className="block text-xs text-slate-300">
            AI Generated Summary
            <textarea value={edited} onChange={(e) => setEdited(e.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-sm text-slate-100" />
          </label>
          <div className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
            <p>Original length: {String(report?.originalText || '').length} characters</p>
            <p>Summary length: {String(edited).length} characters</p>
            <p>Generated in: {generationSeconds} seconds</p>
            <p>Model: facebook/bart-large-cnn</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <p className="text-xs font-semibold text-slate-200">Medical Terms Simplified</p>
            {simplifiedTerms.length === 0 ? <p className="mt-1 text-xs text-slate-400">No explicit substitutions detected.</p> : (
              <ul className="mt-1 space-y-1 text-xs text-slate-300">
                {simplifiedTerms.map(([src, dst]) => <li key={src}>{src} → {dst}</li>)}
              </ul>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onRejectRegenerate} className="rounded-md border border-rose-300/30 px-3 py-2 text-xs text-rose-100">Reject & Regenerate</button>
            <button type="button" onClick={() => onApprove(edited)} className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100">
              Approve Summary
            </button>
          </div>
        </>
      )}

      <div className="rounded-lg border border-amber-300/20 bg-amber-500/5 p-3 text-xs text-amber-50">
        ⚠️ This summary is for informational purposes only and does not constitute medical advice. Always consult with your healthcare provider.
      </div>
    </section>
  );
}

export default AISummaryReview;

