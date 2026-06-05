/**
 * Resolve isDraft after a doctor save.
 * undefined + Completed appointment → publish to patient portal (fixes stuck drafts).
 */
export const resolveIsDraftForSave = (bodyIsDraft, appointmentStatus, consultation) => {
  if (bodyIsDraft === true) return true;
  if (bodyIsDraft === false) return false;
  if (appointmentStatus === 'Completed') return false;
  return consultation?.isDraft ?? true;
};

/** Consultations visible to patients: finalized or legacy draft on a completed visit. */
export const patientVisibleConsultationClause = (completedAppointmentIds = []) => {
  if (!completedAppointmentIds?.length) {
    return { isDraft: false };
  }
  return {
    $or: [
      { isDraft: false },
      { isDraft: true, appointmentId: { $in: completedAppointmentIds } },
    ],
  };
};

/** Shape consultation for doctor modal (backward-compatible bundle). */
export const toConsultationBundle = (consultation) => {
  if (!consultation) {
    return { consultation: null, prescription: null, report: null, summary: null };
  }

  const c = consultation.toObject ? consultation.toObject() : consultation;
  const hasReport = Boolean(c.medicalReport?.title);
  const summary = c.medicalReport?.summary;
  const hasSummary = summary && summary.status && summary.status !== 'Not Generated';

  return {
    consultation: c,
    prescription: c.prescription?.items?.length ? { items: c.prescription.items } : null,
    report: hasReport
      ? {
          _id: c._id,
          consultationId: c._id,
          appointmentId: c.appointmentId,
          patientId: c.patientId,
          doctorId: c.doctorId,
          title: c.medicalReport.title,
          fileType: c.medicalReport.fileType,
          originalText: c.medicalReport.originalText,
          pdfName: c.medicalReport.pdfName,
          createdAt: c.medicalReport.uploadedAt || c.updatedAt,
        }
      : null,
    summary: hasSummary
      ? {
          _id: c._id,
          consultationId: c._id,
          ...summary,
        }
      : null,
  };
};

export const reportSummaryStatus = (consultation) => {
  const status = consultation?.medicalReport?.summary?.status;
  if (!consultation?.medicalReport?.title) return 'Not Generated';
  return status || 'Not Generated';
};

/** Row for patient /patient/reports list */
export const toPatientReportRow = (c, extras = {}) => {
  const row = c.toObject ? c.toObject() : c;
  const summary = row.medicalReport?.summary;
  const status = reportSummaryStatus(row);
  return {
    _id: row._id,
    reportId: row._id,
    consultationId: row._id,
    appointmentId: row.appointmentId || null,
    title: row.medicalReport?.title,
    fileType: row.medicalReport?.fileType,
    pdfName: row.medicalReport?.pdfName || '',
    hasPdfDownload: row.medicalReport?.fileType === 'pdf',
    uploadedAt: row.medicalReport?.uploadedAt || row.updatedAt,
    summaryStatus: status,
    simplifiedSummary: status === 'Approved' ? summary?.simplifiedSummary || '' : '',
    approvedAt: status === 'Approved' ? summary?.approvedAt || null : null,
    approvedByName: extras.approvedByName || null,
    doctorName: extras.doctorName || null,
    medicalTermsExplained: [],
  };
};

/** Flat row for doctor reports table (consultation id = report id). */
export const toDoctorReportRow = (c, patientPopulated = null) => {
  const row = c.toObject ? c.toObject() : c;
  const patient = patientPopulated || row.patientId;
  const report = row.medicalReport || {};
  const summary = report.summary;
  return {
    _id: row._id,
    consultationId: row._id,
    appointmentId: row.appointmentId,
    patientId: patient,
    title: report.title,
    fileType: report.fileType,
    // Included so the Edit Report modal can display current file info and pre-fill text.
    pdfName: report.pdfName || '',
    pdfSizeBytes: report.pdfSizeBytes || 0,
    originalText: report.fileType === 'text' ? (report.originalText || '') : '',
    createdAt: report.uploadedAt || row.updatedAt,
    summaryStatus: reportSummaryStatus(row),
    summary:
      summary && summary.status !== 'Not Generated'
        ? { _id: row._id, consultationId: row._id, ...summary }
        : null,
  };
};

/** Flat row for doctor/patient prescriptions list. */
export const toPrescriptionRow = (c, extras = {}) => {
  const row = c.toObject ? c.toObject() : c;
  return {
    _id: row._id,
    items: row.prescription?.items || [],
    patientId: extras.patient || row.patientId,
    doctorId: extras.doctor || row.doctorId,
    consultationId: {
      _id: row._id,
      followUpDate: row.followUpDate,
      appointmentId: extras.appointment || row.appointmentId,
    },
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
    ...extras,
  };
};
