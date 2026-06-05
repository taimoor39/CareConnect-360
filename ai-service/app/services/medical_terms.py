"""
Medical terminology simplification dictionary.

Applied to BART-generated SUMMARY only — never to original input text.
Keys are lowercase; matching is case-insensitive in apply_medical_dictionary.
"""

MEDICAL_TERMS_DICT = {
  # ── COMPOUND TERMS ──────────────────────────
  # Processed before single-word entries (apply_medical_dictionary sorts by length desc).
  # Prevents word-by-word replacement creating redundant phrases such as
  # "sudden fast heart rate" (acute→sudden + tachycardia→fast heart rate) or
  # "sudden temporary reduced blood flow" (acute + transient + ischemia).
  "acute myocardial infarction": "heart attack",
  "transient myocardial ischemia": "temporary reduced heart blood flow",
  "acute tachycardia": "rapid heart rate",
  "acute dyspnea": "sudden breathing difficulty",
  "chronic hypertension": "long-term high blood pressure",
  "transient ischemia": "temporary reduced blood flow",

  # ── CARDIOVASCULAR ─────────────────────────
  "myocardial infarction": "heart attack",
  "myocardial ischemia": "reduced blood flow to heart",
  "myocardial": "heart muscle",
  "hypertension": "high blood pressure",
  "hypotension": "low blood pressure",
  "tachycardia": "fast heart rate",
  "bradycardia": "slow heart rate",
  "arrhythmia": "irregular heartbeat",
  "atrial fibrillation": "irregular heartbeat",
  "atherosclerosis": "hardening of arteries",
  "angina pectoris": "chest pain",
  "angina": "chest pain",
  "cardiomegaly": "enlarged heart",
  "cardiomyopathy": "heart muscle disease",
  "congestive heart failure": "heart failure",
  "ischemia": "reduced blood flow",
  "ischemic": "reduced blood flow",
  "thrombosis": "blood clot",
  "thrombus": "blood clot",
  "embolism": "blocked blood vessel",
  "stenosis": "narrowing",
  "palpitations": "noticeable heartbeat",
  "hypertrophy": "abnormal enlargement",
  "ventricular": "heart chamber",
  "diastolic": "resting heart pressure",
  "systolic": "pumping heart pressure",

  # ── RESPIRATORY ────────────────────────────
  "dyspnea": "difficulty breathing",
  "dyspnoea": "difficulty breathing",
  "orthopnea": "breathing difficulty when lying down",
  "pneumonia": "lung infection",
  "bronchitis": "airway inflammation",
  "pulmonary embolism": "blood clot in lungs",
  "pulmonary": "lung",
  "pneumothorax": "collapsed lung",
  "pleural effusion": "fluid around lungs",
  "hemoptysis": "coughing up blood",
  "tachypnea": "fast breathing",
  "apnea": "stopped breathing",
  "hypoxia": "low oxygen",
  "hypoxemia": "low blood oxygen",
  "cyanosis": "bluish skin",
  "sputum": "mucus",

  # ── DIGESTIVE / HEPATIC ─────────────────────
  "hepatitis": "liver inflammation",
  "hepatomegaly": "enlarged liver",
  "hepatic": "liver",
  "cirrhosis": "liver scarring",
  "pancreatitis": "pancreas inflammation",
  "gastritis": "stomach inflammation",
  "gastroesophageal reflux": "acid reflux",
  "appendicitis": "appendix inflammation",
  "dysphagia": "difficulty swallowing",
  "ascites": "fluid in abdomen",
  "jaundice": "yellowing of skin",
  "gastrointestinal": "digestive",

  # ── RENAL / URINARY ─────────────────────────
  "renal insufficiency": "kidney problems",
  "renal failure": "kidney failure",
  "renal": "kidney",
  "nephritis": "kidney inflammation",
  "creatinine": "kidney waste marker",
  "proteinuria": "protein in urine",
  "hematuria": "blood in urine",
  "oliguria": "reduced urine output",
  "urinary tract infection": "urine infection",
  "nephrolithiasis": "kidney stones",

  # ── BLOOD / HEMATOLOGY ──────────────────────
  "anemia": "low red blood cells",
  "anaemia": "low red blood cells",
  "hyperlipidemia": "high cholesterol",
  "hypercholesterolemia": "high cholesterol",
  "cholesterol": "blood fat",
  "triglycerides": "blood fats",
  "hemoglobin": "oxygen-carrying protein",
  "haemoglobin": "oxygen-carrying protein",
  "leukocytosis": "high white blood cell count",
  "leukopenia": "low white blood cell count",
  "thrombocytopenia": "low platelet count",
  "erythrocyte": "red blood cell",
  "leukocyte": "white blood cell",
  "coagulation": "blood clotting",
  "sepsis": "severe blood infection",
  "lymphadenopathy": "swollen lymph nodes",
  "splenomegaly": "enlarged spleen",

  # ── ENDOCRINE / METABOLIC ───────────────────
  "diabetes mellitus": "diabetes",
  "hyperglycemia": "high blood sugar",
  "hypoglycemia": "low blood sugar",
  "glucose": "blood sugar",
  "hypothyroidism": "underactive thyroid",
  "hyperthyroidism": "overactive thyroid",

  # ── DIAGNOSTIC TESTS ────────────────────────
  "echocardiogram": "heart ultrasound",
  "electrocardiogram": "heart electrical test",
  "ecg": "heart test",
  "ekg": "heart test",
  "complete blood count": "full blood test",
  "cbc": "full blood test",
  "urinalysis": "urine test",
  "spirometry": "lung capacity test",
  "mammography": "breast scan",
  "biopsy": "tissue sample test",

  # ── GENERAL ─────────────────────────────────
  "acute": "sudden",
  "chronic": "long-term",
  "transient": "temporary",
  "benign": "non-cancerous",
  "malignant": "cancerous",
  "bilateral": "both sides",
  "unilateral": "one side",
  "etiology": "cause",
  "prognosis": "expected outcome",
  "comorbidity": "additional condition",
  "exacerbation": "worsening",
  "remission": "improvement",
  "pyrexia": "fever",
  "febrile": "feverish",
  "edema": "swelling",
  "oedema": "swelling",
  "fibrosis": "scarring",
  "necrosis": "tissue death",
  "inflammation": "swelling and redness",
  "atrophy": "wasting",
  "lesion": "abnormal area",
  "fracture": "broken bone",
  "analgesic": "pain reliever",
  "antipyretic": "fever reducer",
  "antibiotic": "infection medicine",
  "antihypertensive": "blood pressure medicine",
  "diuretic": "water pill",
  "corticosteroid": "steroid",
  "statin": "cholesterol medicine",
  "intravenous": "into the vein",
  "subcutaneous": "under the skin",
  "oral": "by mouth",
  "prophylaxis": "prevention",
  "palliative": "comfort care",
  "contraindication": "reason not to use",
}


def get_python_terms() -> dict:
  """Return the complete Python medical terms dict (lowercase keys)."""
  return dict(MEDICAL_TERMS_DICT)


# Backward compatibility for /api/terms
MEDICAL_TERMS = dict(sorted(MEDICAL_TERMS_DICT.items(), key=lambda kv: kv[0]))


def apply_terms(text: str, extra_terms: dict | None = None) -> dict:
  """Legacy wrapper — always pass BART summary text, not input."""
  from app.services.medical_dictionary import apply_medical_dictionary

  return apply_medical_dictionary(text, get_python_terms(), extra_terms or {})


def simplify_medical_terms(text: str, extra_medical_terms: dict | None = None) -> str:
  return apply_terms(text, extra_medical_terms)["simplified_text"]
