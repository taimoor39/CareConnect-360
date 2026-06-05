import { regenerateAISummary } from '../api/doctor.js';

/**
 * Regenerate AI summary (reject prior + new generation in one backend call).
 */
export function resolveConsultationId(rowOrId) {
  if (!rowOrId) return null;
  if (typeof rowOrId === 'string') return rowOrId;
  return rowOrId.consultationId || rowOrId._id || null;
}

export async function runRegenerateAISummary(consultationId) {
  const id = resolveConsultationId(consultationId);
  if (!id) {
    throw new Error('Report id is missing — cannot regenerate this summary');
  }
  const res = await regenerateAISummary(id);
  return res.data?.data ?? null;
}

export function aiSummaryErrorMessage(error, fallback = 'Failed to regenerate summary') {
  if (error.response?.status === 503) {
    return error.response?.data?.message || 'AI service unavailable — try again shortly';
  }
  return error.response?.data?.message || fallback;
}
