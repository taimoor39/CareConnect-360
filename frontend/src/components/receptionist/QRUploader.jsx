import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_BYTES = 5 * 1024 * 1024;
const VALID_TYPES = /^image\/(png|jpe?g|webp|gif|bmp)$/i;

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

function QRUploader({ onUpload, disabled }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const acceptFile = useCallback((next) => {
    if (!next) return;
    if (!VALID_TYPES.test(next.type)) {
      setError('Unsupported format. Upload PNG, JPG, WebP, GIF or BMP.');
      return;
    }
    if (next.size > MAX_BYTES) {
      setError('Image is too large. Max 5MB.');
      return;
    }
    setError('');
    setFile(next);
  }, []);

  const onPickFile = (event) => {
    const next = event.target.files?.[0];
    acceptFile(next);
    event.target.value = '';
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const next = event.dataTransfer?.files?.[0];
    acceptFile(next);
  };

  const reset = () => {
    setFile(null);
    setError('');
  };

  const submit = async () => {
    if (!file || disabled || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const ok = await onUpload(file);
      if (ok) reset();
    } catch (err) {
      setError(err?.message || 'Could not check in from this image.');
    } finally {
      setSubmitting(false);
    }
  };

  const onPaste = useCallback((event) => {
    if (disabled) return;
    const items = Array.from(event.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type?.startsWith('image/'));
    if (!imageItem) return;
    const next = imageItem.getAsFile();
    if (next) {
      event.preventDefault();
      acceptFile(next);
    }
  }, [acceptFile, disabled]);

  return (
    <section className="glass-panel overflow-hidden rounded-2xl" onPaste={onPaste}>
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-base font-semibold text-white">Upload a QR image</h2>
        <p className="text-xs text-slate-400">Drag &amp; drop a screenshot, paste from clipboard, or browse for a file.</p>
      </div>

      <div className="p-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          onChange={onPickFile}
          className="hidden"
        />

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            disabled={disabled}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
              dragOver
                ? 'border-teal-300/70 bg-teal-400/10'
                : 'border-slate-700/70 bg-slate-900/40 hover:border-teal-300/40 hover:bg-slate-900/70'
            }`}
          >
            <p className="text-sm font-semibold text-white">Drop QR image here</p>
            <p className="text-xs text-slate-400">PNG, JPG, WebP, GIF or BMP — up to 5MB</p>
            <span className="mt-2 rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900">Browse files</span>
          </button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/40">
              {preview ? (
                <img src={preview} alt="QR preview" className="h-32 w-full object-contain" />
              ) : (
                <div className="h-32" />
              )}
            </div>
            <div className="flex flex-col justify-between gap-2">
              <div>
                <p className="truncate text-sm font-medium text-white" title={file.name}>{file.name}</p>
                <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                {error ? (
                  <p className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[0.6875rem] text-rose-100">{error}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || disabled}
                  className="rounded-md bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Decoding…' : 'Check in from image'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={submitting}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/60 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {!file && error ? (
          <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1.5 text-[0.6875rem] text-rose-100">{error}</p>
        ) : null}
      </div>
    </section>
  );
}

export default QRUploader;
