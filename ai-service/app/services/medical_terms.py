"""Medical jargon → plain-language map; merged from defaults + optional admin-provided JSON from Mongo."""

import re
from typing import Mapping

# Canonical term → plain-language mapping (defaults; Mongo-backed terms override on CI match).
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

_ORDERED_BASE_ITEMS = tuple(sorted(_MEDICAL_TERMS_RAW.items(), key=lambda kv: len(kv[0]), reverse=True))


def merge_medical_term_maps(
  base: dict[str, str],
  extra: Mapping[str, str] | None,
) -> dict[str, str]:
  """
  Overlay admin / DB terms on built-ins. Same phrase (case-insensitive) uses the extra mapping.
  """
  if not extra:
    return dict(base)
  merged = dict(base)
  lower_to_key = {k.lower(): k for k in merged}
  for mk_raw, sv_raw in extra.items():
    mk_clean = str(mk_raw).strip()
    sv_clean = str(sv_raw).strip()
    if not mk_clean or not sv_clean:
      continue
    lk = mk_clean.lower()
    old = lower_to_key.get(lk)
    if old is not None:
      del merged[old]
    merged[mk_clean] = sv_clean
    lower_to_key[lk] = mk_clean
  return merged


def simplify_medical_terms(text: str, extra_medical_terms: Mapping[str, str] | None = None) -> str:
  """Replace medical jargon with plain language on BART output (longest phrases first)."""
  if extra_medical_terms:
    merged = merge_medical_term_maps(_MEDICAL_TERMS_RAW, extra_medical_terms)
    ordered = sorted(merged.items(), key=lambda kv: len(kv[0]), reverse=True)
  else:
    ordered = _ORDERED_BASE_ITEMS

  result = text
  for medical, simple in ordered:
    pattern = re.compile(re.escape(medical), re.IGNORECASE)
    result = pattern.sub(simple, result)
  return result
