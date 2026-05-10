import MedicalTerm from '../models/MedicalTerm.js';

/** Cap avoids oversized payloads to the AI service; aligns with Python-side sanitization. */
const MAX_TERMS = 5000;

/**
 * Plain map of medical phrase → patient-friendly phrase for the AI summarizer.
 * Used when calling the Python service so post-BART simplification includes admin-managed terms.
 */
export async function getMedicalTermsMapForAI() {
  const rows = await MedicalTerm.find({})
    .select('medicalTerm simplifiedTerm')
    .sort({ medicalTerm: 1 })
    .lean()
    .limit(MAX_TERMS);

  const map = {};
  for (const row of rows) {
    const k = String(row.medicalTerm ?? '').trim();
    const v = String(row.simplifiedTerm ?? '').trim();
    if (k && v) {
      map[k] = v;
    }
  }
  return map;
}
