import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getAppointmentById, updateAppointmentStatus } from '../../api/appointments.js';
import {
  approveAISummary,
  deleteConsultationReport,
  generateAISummary,
  getAppointmentConsultation,
  upsertAppointmentConsultation,
} from '../../api/doctor.js';
import { aiSummaryErrorMessage, runRegenerateAISummary } from '../../utils/regenerateAISummary.js';
import AISummaryReview from './AISummaryReview.jsx';
import PrescriptionForm from './PrescriptionForm.jsx';
import ReportUploadForm from './ReportUploadForm.jsx';
import { formatDateInPakistan, parseLocalDateFromISO, toISOInputValue } from '../../utils/isoDate.js';

const emptyMedicine = { medicineName: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' };

function resolvePatientId(appointment) {
  const patient = appointment?.patientId;
  if (!patient) return undefined;
  if (typeof patient === 'object' && patient._id) return patient._id;
  return patient;
}

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((e) => e.message).join(' · ');
  }
  return fallback;
}

function DoctorConsultationModal({ open, appointment, doctorName, onClose, onSaved, initialTab = 'notes' }) {
  const [activeTab, setActiveTab] = useState('notes');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [followUpDate, setFollowUpDate] = useState('');
  const [consultationId, setConsultationId] = useState('');
  const [medicines, setMedicines] = useState([{ ...emptyMedicine }]);
  const [reportMode, setReportMode] = useState('text');
  const [reportTitle, setReportTitle] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [showUnavailableBanner, setShowUnavailableBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const loadGenerationRef = useRef(0);

  const tomorrow = useMemo(() => {
    const dt = new Date();
    dt.setDate(dt.getDate() + 1);
    return toISOInputValue(dt);
  }, []);

  const applyBundle = useCallback((data) => {
    const { consultation, prescription, report: savedReport, summary: savedSummary } = data || {};

    if (consultation) {
      setConsultationId(String(consultation._id || ''));
      setSymptoms(consultation.symptoms || '');
      setDiagnosis(consultation.diagnosis || '');
      setNotes(consultation.consultationNotes || '');
      setFollowUpDate(
        consultation.followUpDate ? toISOInputValue(new Date(consultation.followUpDate)) : '',
      );
    } else {
      setConsultationId('');
      setSymptoms('');
      setDiagnosis('');
      setNotes('');
      setFollowUpDate('');
    }

    if (prescription?.items?.length) {
      setMedicines(
        prescription.items.map((item) => ({
          medicineName: item.medicineName || '',
          dosage: item.dosage || '',
          frequency: item.frequency || 'Once daily',
          duration: item.duration || '',
          instructions: item.instructions || '',
        })),
      );
    } else {
      setMedicines([{ ...emptyMedicine }]);
    }

    setReport(savedReport || null);
    setSummary(savedSummary || null);
    if (savedReport?.title) {
      setReportTitle(savedReport.title);
      setReportMode(savedReport.fileType === 'pdf' ? 'pdf' : 'text');
      if (savedReport.fileType === 'text' && savedReport.originalText) {
        setReportText(savedReport.originalText);
      } else {
        setReportText('');
      }
      setReportFile(null);
    } else {
      // Important: clear previous patient's report draft so it never leaks
      // into another patient's consultation modal.
      setReportTitle('');
      setReportText('');
      setReportFile(null);
      setReportMode('text');
    }
    setShowUnavailableBanner(false);
  }, []);

  const refreshBundle = useCallback(async () => {
    if (!appointment?._id) return;
    const generation = ++loadGenerationRef.current;
    setLoadingBundle(true);
    try {
      const res = await getAppointmentConsultation(appointment._id);
      if (generation !== loadGenerationRef.current) return;
      applyBundle(res.data?.data);
    } catch {
      if (generation === loadGenerationRef.current) {
        toast.error('Could not load saved consultation data');
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoadingBundle(false);
      }
    }
  }, [appointment?._id, applyBundle]);

  useEffect(() => {
    if (!open || !appointment?._id) return undefined;
    setActiveTab(initialTab);
    refreshBundle();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [open, appointment?._id, initialTab, refreshBundle]);

  if (!open || !appointment) return null;

  const isCompleted = appointment.status === 'Completed';

  const isFollowUpInPast = (() => {
    if (!followUpDate) return false;
    const picked = parseLocalDateFromISO(followUpDate);
    if (!picked) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return picked <= today;
  })();

  const buildConsultationPayload = (isDraft) => {
    const validMedicines = medicines.filter(
      (m) => m.medicineName.trim().length >= 2 && m.dosage.trim() && m.frequency && m.duration.trim(),
    );

    const payload = {
      symptoms,
      diagnosis,
      consultationNotes: notes,
      followUpDate: followUpDate || null,
    };

    if (validMedicines.length) {
      payload.prescription = { items: validMedicines };
    }

    if (isDraft !== undefined) payload.isDraft = isDraft;

    const trimmedReportTitle = reportTitle.trim();
    const trimmedReportText = reportText.trim();

    if (reportMode === 'text' && trimmedReportText.length > 0) {
      payload.medicalReport = {
        title: trimmedReportTitle.length >= 2 ? trimmedReportTitle : 'Medical Report',
        fileType: 'text',
        originalText: trimmedReportText,
      };
    } else if (reportMode === 'pdf' && reportFile) {
      payload.medicalReport = {
        title: trimmedReportTitle.length >= 2 ? trimmedReportTitle : 'Medical Report',
        fileType: 'pdf',
      };
    }

    return payload;
  };

  const persistConsultation = async (isDraft) => {
    const payload = buildConsultationPayload(isDraft);
    const pdfFile = reportMode === 'pdf' && reportFile ? reportFile : null;
    const res = await upsertAppointmentConsultation(appointment._id, payload, pdfFile);
    const bundle = res.data?.data;
    const saved = bundle?.consultation;
    setConsultationId(saved?._id ? String(saved._id) : '');
    if (bundle) applyBundle(bundle);
    if (pdfFile) setReportFile(null);
    return saved;
  };

  const saveConsultationRecord = async (isDraft) => persistConsultation(isDraft);

  const handleSaveDraft = async () => {
    if (!notes.trim()) {
      toast.error('Consultation notes required');
      return;
    }
    if (!isCompleted && isFollowUpInPast) {
      toast.error('Follow-up date must be in the future');
      return;
    }
    setSavingDraft(true);
    try {
      await saveConsultationRecord(isCompleted ? false : true);
      toast.success(isCompleted ? 'Consultation updated' : 'Consultation saved successfully');
      onSaved?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save consultation'));
    } finally {
      setSavingDraft(false);
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
    if (!isCompleted && isFollowUpInPast) {
      toast.error('Follow-up date must be in the future');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveConsultationRecord(false);
      const readStatus = async () => {
        try {
          const res = await getAppointmentById(appointment._id);
          return res.data?.data?.status ?? appointment.status;
        } catch {
          return appointment.status;
        }
      };
      let status = await readStatus();
      if (status !== 'Completed') {
        if (status === 'Checked-In') {
          await updateAppointmentStatus(appointment._id, { status: 'In-Progress' });
          status = await readStatus();
        }
        if (status === 'In-Progress') {
          await updateAppointmentStatus(appointment._id, { status: 'Completed' });
        }
      }
      toast.success('Consultation saved successfully');
      if (!saved?.isDraft) toast.success('Consultation marked as complete');
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not complete consultation'));
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
    if (!resolvePatientId(appointment)) {
      toast.error('Patient record missing on this appointment');
      return;
    }
    try {
      await persistConsultation(isCompleted ? false : true);
      toast.success('Prescription saved');
      onSaved?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save prescription'));
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

  const handleUploadReport = async ({ mode, title, originalText, file }) => {
    if (!resolvePatientId(appointment)) {
      toast.error('Patient record missing on this appointment');
      return;
    }
    setUploadingReport(true);
    try {
      const payload = buildConsultationPayload(isCompleted ? false : true);
      payload.medicalReport =
        mode === 'pdf'
          ? { title, fileType: 'pdf' }
          : { title, fileType: 'text', originalText };
      const res = await upsertAppointmentConsultation(
        appointment._id,
        payload,
        mode === 'pdf' ? file : null,
      );
      applyBundle(res.data?.data);
      toast.success('Report saved to consultation');
      onSaved?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not save report'));
    } finally {
      setUploadingReport(false);
    }
  };

  const handleDeleteReport = async () => {
    const summaryStatus = summary?.status;
    const isApproved = summaryStatus === 'Approved';
    const msg = isApproved
      ? 'Delete this report permanently? The approved AI summary visible to the patient will also be removed. This cannot be undone.'
      : 'Delete this report permanently? This cannot be undone.';
    if (!window.confirm(msg)) return;

    const targetId = consultationId || report?._id;
    if (!targetId) { toast.error('Report ID missing'); return; }
    setDeletingReport(true);
    try {
      await deleteConsultationReport(targetId);
      setReport(null);
      setSummary(null);
      setReportTitle('');
      setReportText('');
      setReportFile(null);
      setReportMode('text');
      toast.success('Report deleted — you can now upload a new one');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete report');
    } finally {
      setDeletingReport(false);
    }
  };

  const handleGenerateSummary = async () => {
    const summaryTargetId = consultationId || report?._id;
    if (!summaryTargetId) return;
    setGenerating(true);
    setShowUnavailableBanner(false);
    try {
      const res = await generateAISummary(summaryTargetId);
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
    <div className="care-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section className="care-modal-panel care-modal-panel--2xl flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="shrink-0 border-b border-[var(--border)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-white">Patient: {appointment.patientId?.name} ({appointment.patientId?.patientId || appointment.patientId?.patientCode || '--'})</p>
              <p className="text-xs text-slate-400">Doctor: Dr. {doctorName} | Date: {formatDateInPakistan(appointment.date)} {appointment.timeSlot}</p>
            </div>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-200">{appointment.status}</span>
          </div>
        </header>

        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-5 py-3 text-xs">
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loadingBundle ? (
            <p className="text-sm text-slate-400">Loading saved consultation…</p>
          ) : null}
          {!loadingBundle && activeTab === 'notes' ? (
            <div className="space-y-4">
              <label className="block text-xs text-slate-300">Symptoms
                <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" placeholder="Describe symptoms, complaints, observations..." />
              </label>
              <label className="block text-xs text-slate-300">Diagnosis
                <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
              </label>
              <label className="block text-xs text-slate-300">Consultation Notes *
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 min-h-32 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
              </label>
              <label className="block text-xs text-slate-300">Follow-up Date
                <input value={followUpDate} min={isCompleted ? undefined : tomorrow} onChange={(e) => setFollowUpDate(e.target.value)} type="date" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 p-2 text-sm text-slate-100" />
              </label>
            </div>
          ) : null}

          {!loadingBundle && activeTab === 'prescription' ? (
            <PrescriptionForm medicines={medicines} setMedicines={setMedicines} onSave={handleSavePrescription} saving={saving} />
          ) : null}

          {!loadingBundle && activeTab === 'report' ? (
            <div className="space-y-4">
              {report?.title ? (
                <div className="flex items-start gap-2 rounded-lg border border-teal-300/20 bg-teal-400/5 p-3 text-sm text-teal-100">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Saved report: {report.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {report.fileType === 'pdf' ? 'PDF upload' : 'Text report'} · included when you Save Draft
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Delete this report permanently"
                    disabled={deletingReport || generating}
                    onClick={handleDeleteReport}
                    className="shrink-0 rounded border border-rose-500/40 px-2 py-0.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-40"
                  >
                    {deletingReport ? '…' : '×'}
                  </button>
                </div>
              ) : null}
              <ReportUploadForm
                patientId={resolvePatientId(appointment)}
                mode={reportMode}
                onModeChange={setReportMode}
                title={reportTitle}
                onTitleChange={setReportTitle}
                text={reportText}
                onTextChange={setReportText}
                file={reportFile}
                onFileChange={setReportFile}
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
                    const summaryTargetId = consultationId || report?._id;
                    if (!summaryTargetId) return;
                    setGenerating(true);
                    setShowUnavailableBanner(false);
                    try {
                      const data = await runRegenerateAISummary(summaryTargetId);
                      setSummary(data);
                      toast.success('Summary regenerated for this report');
                      onSaved?.();
                    } catch (error) {
                      if (error.response?.status === 503) {
                        setShowUnavailableBanner(true);
                      }
                      toast.error(aiSummaryErrorMessage(error, 'Could not regenerate summary'));
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  onApprove={async (editedSummary) => {
                    const summaryTargetId = consultationId || report?._id;
                    if (!summaryTargetId) return;
                    if (!String(editedSummary || '').trim()) {
                      toast.error('Cannot approve empty/blank summary text');
                      return;
                    }
                    try {
                      await approveAISummary(summaryTargetId, { editedSummary });
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

          {/* Keep report fields mounted so typed text survives tab switches and is included in Save Draft */}
          {!loadingBundle && activeTab !== 'report' && reportText.trim() ? (
            <p className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
              Medical report text ({reportText.trim().length} chars) will be included when you save.
            </p>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200">Cancel</button>
          <button
            type="button"
            disabled={savingDraft || !notes.trim()}
            onClick={handleSaveDraft}
            className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-200 disabled:opacity-50"
          >
            {savingDraft ? 'Saving…' : isCompleted ? 'Save Changes' : 'Save Draft'}
          </button>
          {!isCompleted ? (
            <button
              type="button"
              disabled={!notes.trim() || saving}
              onClick={handleComplete}
              className="rounded-md border border-teal-300/25 bg-teal-400/10 px-3 py-2 text-xs font-semibold text-teal-100 disabled:opacity-50"
            >
              Mark Appointment Complete
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

export default DoctorConsultationModal;

