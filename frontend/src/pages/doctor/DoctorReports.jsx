import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  approveAISummary,
  generateAISummary,
  getDoctorReports,
  rejectAISummary,
} from '../../api/doctor.js';
import AISummaryReview from '../../components/doctor/AISummaryReview.jsx';
import DoctorLayout from '../../components/doctor/DoctorLayout.jsx';
import { getAuthUser } from '../../utils/authUser.js';
import { formatDateInPakistan } from '../../utils/isoDate.js';

const statusClass = {
  'Not Generated': 'bg-slate-700 text-slate-200',
  'Pending Approval': 'bg-amber-500/20 text-amber-200',
  Approved: 'bg-emerald-500/20 text-emerald-200',
  Rejected: 'bg-rose-500/20 text-rose-200',
};

function DoctorReports() {
  const auth = getAuthUser();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);

  const fetchReports = async () => {
    try {
      const res = await getDoctorReports();
      setReports(res.data?.data || []);
    } catch (error) {
      toast.error('Failed to load reports');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const rows = useMemo(() => reports, [reports]);

  return (
    <>
    <DoctorLayout title="Medical Reports" doctorName={auth.name}>
      <section className="glass-panel overflow-hidden rounded-2xl">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-300">
            <tr>
              <th className="px-4 py-3">Report Title</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Summary Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b border-slate-800/60">
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">{row.patientId?.name || '--'}</td>
                <td className="px-4 py-3">{formatDateInPakistan(row.createdAt)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 ${statusClass[row.summaryStatus] || statusClass['Not Generated']}`}>
                    {row.summaryStatus === 'Pending Approval' ? 'Awaiting Review' : row.summaryStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-slate-200" onClick={() => { setSelected(row); setSummary(row.summary || null); }}>
                      View
                    </button>
                    {row.summaryStatus === 'Not Generated' ? (
                      <button
                        type="button"
                        className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100"
                        onClick={async () => {
                          setGenerating(true);
                          try {
                            const res = await generateAISummary(row._id);
                            setSummary(res.data?.data || null);
                            toast.success('AI summary generated');
                            await fetchReports();
                            setSelected(row);
                          } catch (error) {
                            toast.error(error.response?.status === 503 ? 'AI service unavailable — try later' : 'Failed to generate summary');
                          } finally {
                            setGenerating(false);
                          }
                        }}
                      >
                        Generate Summary
                      </button>
                    ) : null}
                    {row.summaryStatus === 'Pending Approval' ? (
                      <button
                        type="button"
                        className="rounded-md border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-100"
                        onClick={() => { setSelected(row); setSummary(row.summary || null); }}
                      >
                        Review
                      </button>
                    ) : null}
                    {['Approved', 'Rejected'].includes(row.summaryStatus) ? (
                      <button
                        type="button"
                        className="rounded-md border border-rose-300/25 px-2.5 py-1 text-[11px] text-rose-100"
                        onClick={async () => {
                          await rejectAISummary(row._id);
                          const res = await generateAISummary(row._id);
                          setSummary(res.data?.data || null);
                          toast.success('AI summary generated');
                          await fetchReports();
                          setSelected(row);
                        }}
                      >
                        Re-generate
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DoctorLayout>
    {selected ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">{selected.title}</h3>
            <button type="button" className="rounded border border-slate-700 px-2 py-1 text-xs" onClick={() => setSelected(null)}>Close</button>
          </div>
          <AISummaryReview
            report={selected}
            summary={summary}
            generating={generating}
            onGenerate={async () => {
              setGenerating(true);
              try {
                const res = await generateAISummary(selected._id);
                setSummary(res.data?.data || null);
                toast.success('AI summary generated');
                await fetchReports();
              } catch (error) {
                toast.error(error.response?.status === 503 ? 'AI service unavailable — try later' : 'Failed to generate summary');
              } finally {
                setGenerating(false);
              }
            }}
            onRejectRegenerate={async () => {
              await rejectAISummary(selected._id);
              setSummary(null);
              toast.warning('Summary rejected');
              await fetchReports();
            }}
            onApprove={async (editedSummary) => {
              if (!summary?._id) return;
              await approveAISummary(selected._id, { summaryId: summary._id, editedSummary });
              toast.success('Summary approved — patient can now view');
              await fetchReports();
              setSummary((prev) => ({ ...prev, simplifiedSummary: editedSummary, status: 'Approved' }));
            }}
          />
        </div>
      </div>
    ) : null}
    </>
  );
}

export default DoctorReports;

