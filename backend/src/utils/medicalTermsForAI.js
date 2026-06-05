import MedicalTerm from '../models/MedicalTerm.js';

/**
 * Loads admin-managed medical → simplified pairs from MongoDB for the summarizer HTTP request.
 * The Python service merges this map with its built-in defaults (longest phrase wins on substitution).
 *
 * MAX_TERMS caps payload size (aligned with ai-service sanitization).
 */
const MAX_TERMS = 5000;

/** Returns plain { medicalPhrase: simplifiedPhrase } for POST /api/summarize payloads. */
export async function getMedicalTermsMapForAI() {
  const rows = await MedicalTerm.find({})
    .select('medicalTerm simplifiedTerm')
    .sort({ medicalTerm: 1 })
    .lean()
    .limit(MAX_TERMS);

  const map = {};
  for (const row of rows) {
    const k = String(row.medicalTerm ?? '').trim().toLowerCase();
    const v = String(row.simplifiedTerm ?? '').trim();
    if (k && v) {
      map[k] = v;
    }
  }
  return map;
}
