import re

# Canonical term → plain-language mapping (single source for AI substitution + /api/terms).
_MEDICAL_TERMS_RAW = {
  "hypertension": "high blood pressure",
  "hyperlipidemia": "high cholesterol",
  "myocardial infarction": "heart attack",
  "renal insufficiency": "kidney problems",
  "dyspnea": "difficulty breathing",
  "tachycardia": "fast heart rate",
  "anemia": "low red blood cells",
  "hepatomegaly": "enlarged liver",
  "bradycardia": "slow heart rate",
  "hypertrophy": "abnormal enlargement",
  "ischemia": "reduced blood flow",
  "myocardial ischemia": "reduced blood flow",
  "edema": "swelling",
  "arrhythmia": "irregular heartbeat",
  "atherosclerosis": "hardening of arteries",
  "thrombosis": "blood clot",
  "embolism": "blocked blood vessel",
  "infarction": "tissue death from blocked blood",
  "stenosis": "narrowing",
  "fibrosis": "scarring of tissue",
  "necrosis": "tissue death",
  "sepsis": "severe infection in bloodstream",
  "pneumonia": "lung infection",
  "hypoglycemia": "low blood sugar",
  "hyperglycemia": "high blood sugar",
  "diabetes mellitus": "diabetes",
  "osteoporosis": "weak and brittle bones",
  "arthritis": "joint inflammation",
  "dermatitis": "skin inflammation",
  "gastritis": "stomach lining inflammation",
  "hepatitis": "liver inflammation",
  "nephritis": "kidney inflammation",
  "appendicitis": "appendix inflammation",
  "bronchitis": "airway inflammation",
  "pancreatitis": "pancreas inflammation",
  "cholesterol": "fatty substance in blood",
  "glucose": "blood sugar",
  "hemoglobin": "oxygen-carrying protein in blood",
  "leukocyte": "white blood cell",
  "erythrocyte": "red blood cell",
  "platelet": "blood clotting cell",
  "serum": "liquid part of blood",
  "biopsy": "tissue sample test",
  "catheter": "thin tube inserted in body",
  "dialysis": "kidney filtering treatment",
  "echocardiogram": "heart ultrasound",
  "electrocardiogram": "heart electrical activity test",
  "endoscopy": "internal camera examination",
  "mammography": "breast X-ray",
  "laparoscopy": "keyhole surgery examination",
}

# Stable order for API consumers (alphabetical by medical term).
MEDICAL_TERMS = dict(sorted(_MEDICAL_TERMS_RAW.items(), key=lambda kv: kv[0].lower()))

# Longer phrases first so e.g. "myocardial ischemia" replaces before "ischemia".
_MEDICAL_TERMS_SUBST_ORDER = dict(
  sorted(_MEDICAL_TERMS_RAW.items(), key=lambda kv: len(kv[0]), reverse=True),
)


def simplify_medical_terms(text: str) -> str:
  result = text
  for medical, simple in _MEDICAL_TERMS_SUBST_ORDER.items():
    pattern = re.compile(re.escape(medical), re.IGNORECASE)
    result = pattern.sub(simple, result)
  return result
