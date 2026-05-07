import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getMyReports } from '../../api/patientPortal.js';
import PatientPaginationBar from '../../components/patient/PatientPaginationBar.jsx';
import ReportSummaryModal from '../../components/patient/ReportSummaryModal.jsx';
import { formatDate } from '../../utils/dateHelpers.js';

function PatientReports() {
  const { patient } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyReports({ page, limit: 10 });
      setRows(res.data?.data?.reports || []);
      setPagination(res.data?.data?.pagination || { total: 0, pages: 1, limit: 10 });
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {loading ? <p className="text-slate-400">Loading…</p> : null}
      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <p className="text-4xl" aria-hidden="true">
            📄
          </p>
          <p className="mt-3 text-slate-300">No reports available yet.</p>
        </div>
      ) : null}

      {rows.map((r) => (
        <article key={r._id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6">
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
            Summary available
          </span>
          <h3 className="mt-4 text-lg font-semibold text-white">{r.title || 'Report'}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Uploaded {r.uploadedAt ? formatDate(r.uploadedAt) : '—'}
            {r.approvedByName ? ` · Approved by Dr. ${r.approvedByName}` : ''}
            {r.approvedAt ? ` · ${formatDate(r.approvedAt)}` : ''}
          </p>
          <button
            type="button"
            onClick={() => setOpenId(r.reportId)}
            className="mt-4 rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950"
          >
            View summary →
          </button>
        </article>
      ))}

      <PatientPaginationBar
        page={pagination.page || page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />

      <ReportSummaryModal open={!!openId} reportId={openId} patient={patient} onClose={() => setOpenId(null)} />
    </div>
  );
}

export default PatientReports;
