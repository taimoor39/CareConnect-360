import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

let lastDecodeToastAt = 0;

function QRScanner({ onDecoded, disabled }) {
  const processingRef = useRef(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);

  useEffect(() => {
    if (disabled) return undefined;

    const onSuccess = async (decodedText) => {
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        await onDecoded(String(decodedText || '').trim());
      } finally {
        processingRef.current = false;
      }
    };

    const onFailure = (error) => {
      const msg = String(error?.message || error || '');
      if (/Permission|NotAllowed|denied|NotReadableError/i.test(msg)) {
        setCameraBlocked(true);
        return;
      }
      if (/NotFound|No MultiFormat Readers|No barcode|QR code parse error|No QR code/i.test(msg)) {
        return;
      }
      const now = Date.now();
      if (now - lastDecodeToastAt > 8000) {
        lastDecodeToastAt = now;
        // Parent may toast; keep UI quiet here for noisy frames
      }
    };

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false,
    );
    try {
      scanner.render(onSuccess, onFailure);
      const t = setTimeout(() => setScannerReady(true), 400);
      return () => {
        clearTimeout(t);
        scanner.clear().catch(() => {});
        setScannerReady(false);
      };
    } catch {
      setCameraBlocked(true);
      return () => {};
    }
  }, [disabled, onDecoded]);

  return (
    <article className="glass-panel rounded-2xl p-4">
      <h2 className="text-base font-semibold text-white">Scan patient QR code</h2>
      <p className="text-xs text-slate-400">Point the camera at the appointment QR on the patient&apos;s phone or printout.</p>
      {cameraBlocked ? (
        <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">Camera access blocked</p>
      ) : null}
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
        <div id="qr-reader" />
        {!cameraBlocked && !scannerReady ? <p className="mt-2 text-xs text-slate-400">Starting camera…</p> : null}
        {!cameraBlocked && scannerReady ? <p className="mt-2 text-xs text-slate-400">Align the QR code inside the box</p> : null}
      </div>
    </article>
  );
}

export default QRScanner;
