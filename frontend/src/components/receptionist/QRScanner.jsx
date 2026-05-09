import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const READER_ID = 'qr-reader';

function QRScanner({ onDecoded, disabled }) {
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      await scanner.clear();
    } catch {
      // already stopped — safe to ignore
    } finally {
      scannerRef.current = null;
      setRunning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    setError('');
    setStarting(true);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(READER_ID, { verbose: false });
      }
      const scanner = scannerRef.current;

      const onSuccess = async (decodedText) => {
        if (processingRef.current) return;
        processingRef.current = true;
        try {
          await onDecoded(String(decodedText || '').trim());
        } finally {
          // Small grace window so we don't immediately re-fire on the
          // same QR before the parent has finished its toast/state work.
          setTimeout(() => {
            processingRef.current = false;
          }, 1200);
        }
      };

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        onSuccess,
        () => {
          // ignore per-frame "no QR found" noise
        },
      );
      setRunning(true);
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (/Permission|NotAllowed|denied/i.test(msg)) {
        setError('Camera permission was blocked. Allow access in your browser settings, then try again.');
      } else if (/NotFound|no camera|requested device/i.test(msg)) {
        setError('No camera detected on this device.');
      } else if (/NotReadable/i.test(msg)) {
        setError('Camera is in use by another app. Close it and try again.');
      } else {
        setError('Could not start camera. Use image upload or manual entry below.');
      }
    } finally {
      setStarting(false);
    }
  }, [onDecoded]);

  useEffect(() => () => {
    // Component unmount — release camera handle.
    stopScanner();
  }, [stopScanner]);

  return (
    <section className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-white">Scan patient QR code</h2>
          <p className="text-xs text-slate-400">Point the camera at the appointment QR on the patient&apos;s phone or printout.</p>
        </div>
        {running ? (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/60"
          >
            Stop
          </button>
        ) : null}
      </div>

      <div className="p-4">
        {error ? (
          <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            {error}
          </p>
        ) : null}

        <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
          <div
            id={READER_ID}
            className="qr-reader-frame mx-auto aspect-square w-full max-w-[22rem]"
          />

          {running ? (
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[15rem] w-[15rem] -translate-x-1/2 -translate-y-1/2">
              <span className="absolute left-0 top-0 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-teal-300" />
              <span className="absolute right-0 top-0 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-teal-300" />
              <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-teal-300" />
              <span className="absolute bottom-0 right-0 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-teal-300" />
            </span>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 py-8 text-center">
              <p className="text-sm font-semibold text-white">Camera is off</p>
              <p className="mt-1 max-w-[20rem] text-xs text-slate-400">
                Press start to scan, or use the upload / manual options.
              </p>
              <button
                type="button"
                onClick={startScanner}
                disabled={disabled || starting}
                className="mt-4 rounded-md bg-teal-500 px-4 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {starting ? 'Starting…' : 'Start camera'}
              </button>
            </div>
          )}
        </div>

        {running ? (
          <p className="mt-2 text-xs text-slate-400">Align the QR code inside the frame — auto-scans every 100ms.</p>
        ) : null}
      </div>
    </section>
  );
}

export default QRScanner;
