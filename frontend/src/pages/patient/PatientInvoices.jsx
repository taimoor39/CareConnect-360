import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getInvoiceById } from '../../api/billing.js';
import { downloadInvoicePDF, getMyInvoices } from '../../api/patientPortal.js';
import PatientPaginationBar from '../../components/patient/PatientPaginationBar.jsx';
import { formatDate, formatDateTime } from '../../utils/dateHelpers.js';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

const statusClass = {
  Paid: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  Unpaid: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  Partial: 'bg-amber-500/15 text-amber-100 ring-amber-400/30',
};

const tabs = [
  { id: '', label: 'All' },
  { id: 'Paid', label: 'Paid' },
  { id: 'Unpaid', label: 'Unpaid' },
  { id: 'Partial', label: 'Partial' },
];

function PatientInvoices() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [status, setStatus] = useState('');
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const pageNum = pagination.page || 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inv = await getMyInvoices({
        page: pageNum,
        limit: 10,
        ...(status ? { status } : {}),
      });
      setRows(inv.data?.data?.invoices || []);
      setPagination(inv.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
      setOutstandingTotal(Number(inv.data?.data?.outstandingTotal || 0));
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [pageNum, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (inv) => {
    try {
      const res = await getInvoiceById(inv._id);
      setDetail(res.data?.data || null);
    } catch {
      toast.error('Could not load invoice details');
    }
  };

  const download = async (inv) => {
    try {
      const res = await downloadInvoicePDF(inv._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${inv.invoiceNumber || 'invoice'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const showBanner = outstandingTotal > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {showBanner ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 text-sm text-amber-50/95">
          <p className="font-semibold">You have outstanding payments</p>
          <p className="mt-2">Total due: {money(outstandingTotal)}</p>
          <p className="mt-1 text-amber-100/80">Please visit reception to complete your payment.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id || 'all'}
            type="button"
            onClick={() => {
              setStatus(t.id);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              status === t.id ? 'bg-teal-500 text-slate-950' : 'border border-slate-700 bg-slate-900/60 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-slate-400">Loading…</p> : null}

      <div className="space-y-4">
        {!loading && rows.length === 0 ? <p className="text-center text-slate-500">No invoices found.</p> : null}
        {rows.map((inv) => {
          const due = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
          return (
            <article key={inv._id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-teal-200">{inv.invoiceNumber}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusClass[inv.paymentStatus] || statusClass.Unpaid}`}>
                  {inv.paymentStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">{formatDate(inv.createdAt)}</p>
              <p className="mt-1 text-white">
                Dr. {inv.doctorId?.name || '—'} — {inv.doctorSpecialization || '—'}
              </p>
              <div className="mt-4 space-y-1 text-sm">
                <p className="flex justify-between text-slate-300">
                  <span>Total</span>
                  <span>{money(inv.totalAmount)}</span>
                </p>
                <p className={`flex justify-between ${inv.paymentStatus === 'Paid' ? 'text-emerald-300' : 'text-slate-300'}`}>
                  <span>Paid</span>
                  <span>{money(inv.paidAmount)}</span>
                </p>
                {due > 0 ? (
                  <p className="flex justify-between text-amber-200">
                    <span>Due</span>
                    <span>{money(due)}</span>
                  </p>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => openDetail(inv)} className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200">
                  View details
                </button>
                <button type="button" onClick={() => download(inv)} className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-slate-950">
                  Download PDF
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <PatientPaginationBar
        page={pagination.page || 1}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
      />

      {detail ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setDetail(null)}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{detail.invoiceNumber}</h3>
              <button type="button" className="text-slate-400 hover:text-white" onClick={() => setDetail(null)}>
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(detail.createdAt)}</p>
            <ul className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm">
              {(detail.items || []).map((line, i) => (
                <li key={i} className="flex justify-between text-slate-300">
                  <span>{line.description}</span>
                  <span>{money(line.total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-slate-800 pt-3 font-semibold text-white">
              <span>Total</span>
              <span>{money(detail.totalAmount)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default PatientInvoices;
