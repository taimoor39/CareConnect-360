import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { updateAppointmentStatus } from '../../api/appointments.js';
import {
  approveAISummary,
  createConsultation,
  createPrescription,
  generateAISummary,
  rejectAISummary,
  updateConsultation,
  uploadReport,
  uploadReportPDF,
} from '../../api/doctor.js';
import AISummaryReview from './AISummaryReview.jsx';
import PrescriptionForm from './PrescriptionForm.jsx';
import ReportUploadForm from './ReportUploadForm.jsx';
import { formatDateInPakistan, parseLocalDateFromISO, toISOInputValue } from '../../utils/isoDate.js';

const emptyMedicine = { medicineName: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' };

function DoctorConsultationModal({ open, appointment, doctorName, readOnly = false, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('notes');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [followUpDate, setFollowUpDate] = useState('');
  const [consultationId, setConsultationId] = useState('');
  const [medicines, setMedicines] = useState([{ ...emptyMedicine }]);
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [showUnavailableBanner, setShowUnavailableBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const tomorrow = useMemo(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return toISOInputValue(dt);
  }, []);

  if (!open || !appointment) return null;

  const isFollowUpInPast = (() => {
    if (!followUpDate) return false;
    const picked = parseLocalDateFromISO(followUpDate);
    if (!picked) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return picked <= today;
  })();

  const saveConsultationRecord = async (isDraft) => {
    const payload = {
      symptoms,
      diagnosis,
      consultationNotes: notes,
      followUpDate: followUpDate || undefined,
      isDraft,
    };
    const res = consultationId
      ? await updateConsultation(consultationId, payload)
      : await createConsultation({ appointmentId: appointment._id, ...payload });
    setConsultationId(res.data?.data?._id || '');
    return res.data?.data;
  };

  const handleSaveDraft = async () => {
    if (!notes.trim()) {
      toast.error('Consultation notes required');
      return;
    }
    if (isFollowUpInPast) {
      toast.error('Follow-up date must be in the future');
      return;
    }
    try {
      await saveConsultationRecord(true);
      toast.success('Consultation saved successfully');
      onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save consultation');
    }
  };

  const handleComplete = async () => {
    if (!notes.trim()) {
      toast.error('Consultation notes required');
      return;
    }
    if (notes.trim().length < 10) {
      toast.error('Consultation notes required');
      return;
    }
    if (isFollowUpInPast) {
      toast.error('Follow-up date must be in the future');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveConsultationRecord(false);
      if (appointment.status === 'Checked-In') {
        await updateAppointmentStatus(appointment._id, { status: 'In-Progress' });
      }
      if (appointment.status === 'In-Progress') {
        await updateAppointmentStatus(appointment._id, { status: 'Completed' });
      }
      toast.success('Consultation saved successfully');
      if (!saved?.isDraft) toast.success('Consultation marked as complete');
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not complete consultation');
    } finally {
      setSaving(false);
    }
  };

  const validateMedicines = () => medicines.length > 0 && medicines.every((m) => m.medicineName.trim().length >= 2 && m.dosage.trim() && m.frequency && m.duration.trim());

  const handleSavePrescription = async () => {
    if (!validateMedicines()) {
      toast.error('Please complete all required medicine fields');
      return;
    }
    if (!consultationId) {
      toast.error('Save consultation notes first');
      return;
    }
    try {
      await createPrescription({
        consultationId,
        patientId: appointment.patientId?._id,
        items: medicines,
      });
      toast.success('Prescription saved');
      onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save prescription');
    }
  };

  const applyTemplate = (type) => {
    if (type === 'Common Cold') {
      setMedicines([{ medicineName: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After meals' }]);
    } else if (type === 'Hypertension') {
      setMedicines([{ medicineName: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days', instructions: 'Same time daily' }]);
    } else if (type === 'Diabetes') {
      setMedicines([{ medicineName: 'Metformin', dosage: '500mg', frequency: 'Twice daily', duration: '30 days', instructions: 'With meals' }]);
    }
  };

  const handleUploadReport = async ({ mode, title, patientId, appointmentId, originalText, file }) => {
    setUploadingReport(true);
    try {
      if (mode === 'pdf') {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('patientId', patientId);
        formData.append('appointmentId', appointmentId || '');
        formData.append('fileType', 'pdf');
        formData.append('file', file);
        const res = await uploadReportPDF(formData);
        setReport(res.data?.data || null);
      } else {
        const res = await uploadReport({ title, patientId, appointmentId, fileType: 'text', originalText });
        setReport(res.data?.data || null);
      }
      toast.success('Report uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not upload report');
    } finally {
      setUploadingReport(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!report?._id) return;
    setGenerating(true);
    setShowUnavailableBanner(false);
    try {
      const res = await generateAISummary(report._id);
      setSummary(res.data?.data || null);
      toast.success('AI summary generated');
      onSaved?.();
    } catch (error) {
      if (error.response?.status === 503) {
        setShowUnavailableBanner(true);
        toast.error('AI service unavailable — try later');
      } else {
        toast.error(error.response?.data?.message || 'AI summarization failed');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <header className="border-b border-slate-800 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-white">Patient: {appointment.patientId?.name} ({appointment.patientId?.patientId || appointment.patientId?.patientCode || '--'})</p>
              <p className="text-xs text-slate-400">Doctor: Dr. {doctorName} | Date: {formatDateInPakistan(appointment.date)} {appointment.timeSlot}</p>
            </div>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">{appointment.status}</span>
          </div>
        </header>

        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-3 text-xs">
          {[
            ['notes', 'Consultation Notes'],
            ['prescription', 'Prescription'],
            ['report', 'Medical Report'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-md px-3 py-2 ${activeTab === key ? 'bg-teal-400/20 text-teal-100 ring-1 ring-teal-300/30' : 'border border-slate-700 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'notes' ? (
            <div className="space-y-4">
              <label className="block text-xs text-slate-300">Symptoms
                <textarea disabled={readOnly} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" placeholder="Describe symptoms, complaints, observations..." />
              </label>
              <label className="block text-xs text-slate-300">Diagnosis
                <textarea disabled={readOnly} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
              </label>
              <label className="block text-xs text-slate-300">Consultation Notes *
                <textarea disabled={readOnly} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
              </label>
              <label className="block text-xs text-slate-300">Follow-up Date
                <input disabled={readOnly} value={followUpDate} min={tomorrow} onChange={(e) => setFollowUpDate(e.target.value)} type="date" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
              </label>
            </div>
          ) : null}

          {activeTab === 'prescription' ? <PrescriptionForm medicines={medicines} setMedicines={setMedicines} onSave={handleSavePrescription} saving={saving} /> : null}

          {activeTab === 'report' ? (
            <div className="space-y-4">
              <ReportUploadForm
                patientId={appointment.patientId?._id}
                appointmentId={appointment._id}
                uploading={uploadingReport}
                onUpload={handleUploadReport}
              />
              {report ? (
                <AISummaryReview
                  report={report}
                  summary={summary}
                  generating={generating}
                  aiUnavailableBanner={showUnavailableBanner}
                  onDismissBanner={() => setShowUnavailableBanner(false)}
                  onGenerate={handleGenerateSummary}
                  onRejectRegenerate={async () => {
                    if (!report?._id) return;
                    try {
                      await rejectAISummary(report._id);
                      setSummary(null);
                      toast.warning('Summary rejected');
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Could not reject summary');
                    }
                  }}
                  onApprove={async (editedSummary) => {
                    if (!summary?._id) return;
                    if (!String(editedSummary || '').trim()) {
                      toast.error('Cannot approve empty/blank summary text');
                      return;
                    }
                    try {
                      await approveAISummary(report._id, { summaryId: summary._id, editedSummary });
                      toast.success('Summary approved — patient can now view');
                      const refreshed = { ...summary, simplifiedSummary: editedSummary, status: 'Approved' };
                      setSummary(refreshed);
                      onSaved?.();
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Could not approve summary');
                    }
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200">Cancel</button>
          <button type="button" disabled={readOnly} onClick={handleSaveDraft} className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200">Save Draft</button>
          <button
            type="button"
            disabled={readOnly || !notes.trim() || saving}
            onClick={handleComplete}
            className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 disabled:opacity-50"
          >
            Mark Appointment Complete
          </button>
        </footer>
      </section>
    </div>
  );
}

export default DoctorConsultationModal;

