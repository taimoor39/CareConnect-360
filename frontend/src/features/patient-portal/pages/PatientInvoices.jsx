import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getInvoiceById } from '@/api/billing.js';
import { downloadInvoicePDF, getMyInvoices } from '@/api/patientPortal.js';
import PatientPaginationBar from '@features/patient-portal/components/PatientPaginationBar.jsx';
import Badge from '@/shared/components/Badge.jsx';
import Card from '@/shared/components/Card.jsx';
import CareModal from '@/shared/components/CareModal.jsx';
import EmptyState, { EmptyStateIconInbox } from '@/shared/components/EmptyState.jsx';
import { formatDate, formatDateTime } from '@/utils/dateHelpers.js';

const money = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

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

  const openDetail = async (invRow) => {
    try {
      const res = await getInvoiceById(invRow._id);
      setDetail(res.data?.data || null);
    } catch {
      toast.error('Could not load invoice details');
    }
  };

  const download = async (invRow) => {
    try {
      const res = await downloadInvoicePDF(invRow._id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invRow.invoiceNumber || 'invoice'}.pdf`;
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
        <div
          className="rounded-[var(--radius-lg)] border px-5 py-4 text-sm"
          style={{
            borderColor: 'rgba(251,191,36,0.35)',
            background: 'rgba(217,119,6,0.12)',
            color: 'rgba(254,243,199,0.95)',
          }}
        >
          <p className="font-semibold text-amber-50">You have outstanding payments</p>
          <p className="mt-2 text-amber-50/95">Total due: {money(outstandingTotal)}</p>
          <p className="mt-1 text-xs font-light text-amber-100/85">Please visit reception to complete your payment.</p>
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
              status === t.id ? 'bg-teal-500 text-slate-950' : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 py-2">
          <div className="skeleton h-28 w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-28 w-full rounded-[var(--radius-lg)]" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {!loading && rows.length === 0 ? (
          <Card padding="0">
            <EmptyState icon={<EmptyStateIconInbox />} title="No invoices found" subtitle="Billing documents will show here once issued." />
          </Card>
        ) : null}
        {rows.map((inv) => {
          const due = Math.max(0, Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0));
          return (
            <Card key={inv._id} padding="20px 22px">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-sm text-[var(--teal-light)]">{inv.invoiceNumber}</span>
                <Badge type={inv.paymentStatus} label={inv.paymentStatus} />
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{formatDate(inv.createdAt)}</p>
              <p className="mt-2 text-sm text-[var(--text-primary)]">
                Dr. {inv.doctorId?.name || '—'} — {inv.doctorSpecialization || '—'}
              </p>
              <div className="mt-4 space-y-1 border-t border-[var(--border)] pt-4 text-sm">
                <p className="flex justify-between text-[var(--text-secondary)]">
                  <span>Total</span>
                  <span>{money(inv.totalAmount)}</span>
                </p>
                <p
                  className={`flex justify-between ${inv.paymentStatus === 'Paid' ? 'text-emerald-300/95' : 'text-[var(--text-secondary)]'}`}
                >
                  <span>Paid</span>
                  <span>{money(inv.paidAmount)}</span>
                </p>
                {due > 0 ? (
                  <p className="flex justify-between text-amber-100/90">
                    <span>Due</span>
                    <span>{money(due)}</span>
                  </p>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => openDetail(inv)} className="care-btn-view">
                  View details
                </button>
                <button type="button" onClick={() => download(inv)} className="care-btn-primary">
                  Download PDF
                </button>
              </div>
            </Card>
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

      <CareModal open={!!detail} onClose={() => setDetail(null)} title={detail?.invoiceNumber || 'Invoice'}>
        {detail ? (
          <>
            <p className="text-xs text-[var(--text-muted)]">{formatDateTime(detail.createdAt)}</p>
            <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
              {(detail.items || []).map((line, i) => (
                <li key={i} className="flex justify-between text-[var(--text-secondary)]">
                  <span>{line.description}</span>
                  <span>{money(line.total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-3 font-semibold text-[var(--text-primary)]">
              <span>Total</span>
              <span>{money(detail.totalAmount)}</span>
            </div>
          </>
        ) : null}
      </CareModal>
    </div>
  );
}

export default PatientInvoices;
