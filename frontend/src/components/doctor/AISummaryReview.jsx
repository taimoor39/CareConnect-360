import { useEffect, useState } from 'react';

function statusBadge(status) {
  if (status === 'Approved') return 'bg-emerald-500/20 text-emerald-200';
  if (status === 'Pending Approval') return 'bg-amber-500/20 text-amber-200';
  if (status === 'Rejected') return 'bg-rose-500/20 text-rose-200';
  if (status === 'Generating') return 'bg-sky-500/20 text-sky-200';
  return 'bg-slate-700 text-slate-200';
}

function formatGenerationTime(ms) {
  const n = Number(ms || 0);
  if (n > 60000) return `${(n / 60000).toFixed(1)} min`;
  return `${(n / 1000).toFixed(1)}s`;
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

  useEffect(() => {
    setEdited(String(summary?.simplifiedSummary ?? ''));
  }, [summary?._id, summary?.simplifiedSummary]);

  const status = generating ? 'Generating' : (summary?.status || 'Not Generated');
  const replacements = summary?.replacementsMade || [];
  const summaryData = summary
    ? {
        originalWords: summary.originalWords ?? 0,
        summaryWords: summary.summaryWords ?? (edited ? edited.split(/\s+/).filter(Boolean).length : 0),
        chunksProcessed: summary.chunksProcessed ?? 1,
        generationMs: summary.generationTimeMs ?? 0,
        replacementsMade: replacements,
      }
    : null;

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
          AI summarization is temporarily unavailable. The original report has been saved and you can generate a summary when the service is restored.
          <button type="button" onClick={onDismissBanner} className="ml-3 underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {!summary ? (
        <button
          type="button"
          disabled={generating}
          onClick={onGenerate}
          className="rounded-md border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-100"
        >
          {generating ? 'Generating summary...' : 'Generate Summary'}
        </button>
      ) : (
        <>
          {summaryData ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Original', value: `${summaryData.originalWords || 0} words` },
                { label: 'Summary', value: `${summaryData.summaryWords || 0} words` },
                {
                  label: 'Processed',
                  value: `${summaryData.chunksProcessed || 1} chunk${(summaryData.chunksProcessed || 1) > 1 ? 's' : ''}`,
                },
                { label: 'Generated in', value: formatGenerationTime(summaryData.generationMs) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2.5 text-center"
                >
                  <div className="text-base font-semibold text-teal-300">{stat.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          ) : null}

          {replacements.length > 0 ? (
            <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-400">
                Medical terms simplified ({replacements.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {replacements.slice(0, 8).map((r) => (
                  <span
                    key={`${r.original}-${r.replacement}`}
                    className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-200"
                  >
                    {r.original} → {r.replacement}
                  </span>
                ))}
                {replacements.length > 8 ? (
                  <span className="text-[11px] text-slate-500">+{replacements.length - 8} more</span>
                ) : null}
              </div>
            </div>
          ) : null}

          <label className="block text-xs text-slate-300">
            AI Generated Summary
            <textarea
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              className="mt-1 min-h-28 w-full rounded-lg border border-slate-700 bg-slate-900/70 p-2 text-sm text-slate-100"
            />
          </label>

          <p className="text-xs text-slate-500">Model: {summary.aiModelUsed || 'facebook/bart-large-cnn'}</p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={onRejectRegenerate}
              className="rounded-md border border-rose-300/30 px-3 py-2 text-xs text-rose-100 disabled:opacity-50"
            >
              {generating ? 'Regenerating…' : 'Reject & Regenerate'}
            </button>
            <button
              type="button"
              onClick={() => onApprove(edited)}
              className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs text-teal-100"
            >
              Approve Summary
            </button>
          </div>
        </>
      )}

      <div className="rounded-lg border border-amber-300/20 bg-amber-500/5 p-3 text-xs text-amber-50">
        This summary is for informational purposes only and does not constitute medical advice. Always consult with your healthcare provider.
      </div>
    </section>
  );
}

export default AISummaryReview;
