const KEY = 'careconnect360_doctor_portal_v1';

const emptyState = {
  consultations: {},
  prescriptions: {},
  reports: [],
  summaries: [],
};

function readState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      consultations: parsed.consultations || {},
      prescriptions: parsed.prescriptions || {},
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      summaries: Array.isArray(parsed.summaries) ? parsed.summaries : [],
    };
  } catch {
    return { ...emptyState };
  }
}

function writeState(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getConsultation(appointmentId) {
  const state = readState();
  return state.consultations[appointmentId] || null;
}

export function saveConsultation(appointmentId, payload) {
  const state = readState();
  state.consultations[appointmentId] = { ...(state.consultations[appointmentId] || {}), ...payload, updatedAt: new Date().toISOString() };
  writeState(state);
  return state.consultations[appointmentId];
}

export function savePrescription(appointmentId, payload) {
  const state = readState();
  state.prescriptions[appointmentId] = { ...(state.prescriptions[appointmentId] || {}), ...payload, updatedAt: new Date().toISOString() };
  writeState(state);
  return state.prescriptions[appointmentId];
}

export function getPrescription(appointmentId) {
  const state = readState();
  return state.prescriptions[appointmentId] || null;
}

export function addReport(payload) {
  const state = readState();
  const report = { _id: `r_${Date.now()}`, createdAt: new Date().toISOString(), ...payload };
  state.reports.unshift(report);
  writeState(state);
  return report;
}

export function listReportsByDoctor(doctorId) {
  const state = readState();
  return state.reports.filter((r) => String(r.doctorId) === String(doctorId));
}

export function saveSummary(payload) {
  const state = readState();
  const idx = state.summaries.findIndex((s) => s.reportId === payload.reportId);
  const row = {
    _id: idx >= 0 ? state.summaries[idx]._id : `s_${Date.now()}`,
    status: 'Pending Approval',
    generatedAt: new Date().toISOString(),
    ...payload,
  };
  if (idx >= 0) state.summaries[idx] = row;
  else state.summaries.unshift(row);
  writeState(state);
  return row;
}

export function approveSummary(summaryId, data = {}) {
  const state = readState();
  state.summaries = state.summaries.map((s) => (s._id === summaryId ? { ...s, ...data, status: 'Approved', approvedAt: new Date().toISOString() } : s));
  writeState(state);
}

export function listSummariesByDoctor(doctorId) {
  const state = readState();
  return state.summaries.filter((s) => String(s.doctorId) === String(doctorId));
}

