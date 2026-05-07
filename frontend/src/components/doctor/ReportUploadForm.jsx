import { useMemo, useState } from 'react';

function bytesToMb(bytes = 0) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReportUploadForm({ patientId, appointmentId, onUpload, uploading = false }) {
  const [mode, setMode] = useState('pdf');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const textCount = text.length;
  const textValid = textCount >= 100 && textCount <= 10000;
  const canSubmit = useMemo(() => {
    if (!title.trim() || title.trim().length < 2) return false;
    if (!patientId) return false;
    if (mode === 'pdf') return Boolean(file);
    return textValid;
  }, [title, patientId, mode, file, textValid]);

  const pickFile = (nextFile) => {
    if (!nextFile) return;
    if (!/\.pdf$/i.test(nextFile.name) || nextFile.type !== 'application/pdf') {
      setError('Only .pdf files are allowed');
      return;
    }
    if (nextFile.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB)');
      return;
    }
    setError('');
    setFile(nextFile);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) {
      setError(mode === 'text' ? 'Report too short for summarization' : 'Please complete required fields');
      return;
    }
    await onUpload({
      mode,
      title: title.trim(),
      patientId,
      appointmentId,
      originalText: text,
      file,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <h3 className="text-base font-semibold text-white">Upload Medical Report</h3>
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={mode === 'pdf'} onChange={() => setMode('pdf')} /> Upload PDF</label>
        <label className="flex items-center gap-2"><input type="radio" checked={mode === 'text'} onChange={() => setMode('text')} /> Enter Text Directly</label>
      </div>

      <label className="block text-xs text-slate-300">
        Report Title *
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Blood Test Report" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
      </label>

      {mode === 'pdf' ? (
        <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/40 p-4">
          <label className="block cursor-pointer text-center text-sm text-slate-300">
            Drag PDF here or click to browse
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
          {file ? (
            <div className="mt-3 flex items-center justify-between rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs">
              <span>{file.name} ({bytesToMb(file.size)})</span>
              <button type="button" onClick={() => setFile(null)} className="text-rose-300">Clear</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100"
            placeholder="Paste or type the medical report text here..."
            maxLength={10000}
          />
          <p className="mt-1 text-xs text-slate-400">{textCount} / 10,000 characters</p>
        </div>
      )}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={!canSubmit || uploading}
        className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload Report'}
      </button>
    </form>
  );
}

export default ReportUploadForm;

