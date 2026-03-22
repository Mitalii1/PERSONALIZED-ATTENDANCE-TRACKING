# backend/timetable_ocr.py

import os
import json
import re
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MOCK_MODE = False

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ── Things that are never subjects ───────────────────────────────────────────
JUNK = {
    'LIBRARY', 'COUNSELLING', 'BATCH COUNSELLING', 'BREAK',
    'MINOR', 'VSB', 'BATCH', 'SND', 'SNZ', 'BSZ',
    'GFM', 'FKS', 'NKS', 'MPN', 'AGS', 'SBT',
    'TGM', 'PS', 'AC', 'ETC', 'ELEC', 'INTSTR'
}

# ── Staff name patterns to filter out ────────────────────────────────────────
STAFF_PATTERN = re.compile(
    r'\b(Mrs|Mr|Dr|Prof)\.?\s+\w+', re.IGNORECASE
)

def is_junk(short: str) -> bool:
    """Return True if this abbreviation is a staff name or non-subject."""
    return short.strip().upper() in JUNK

def clean_abbreviations(abbreviations: list) -> list:
    cleaned = []
    for item in abbreviations:
        short = item.get('short', '').strip()
        full  = item.get('full',  '').strip()
        type_ = item.get('type', 'Theory')  # ← preserve type

        if not short or is_junk(short) or len(short) <= 1:
            continue
        if STAFF_PATTERN.search(full):
            continue
        junk_words = {'library', 'counselling', 'break', 'batch', 'minor', 'ccrp'}
        if any(w in full.lower() for w in junk_words):
            continue

        cleaned.append({'short': short, 'full': full, 'type': type_})  # ← include type

    # Deduplicate
    seen = set()
    deduped = []
    for item in cleaned:
        key = item['short'].upper()
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return deduped


def extract_subjects_from_image(image_bytes: bytes) -> dict:

    if MOCK_MODE:
        return {
            "abbreviations": [
                {"short": "ADS",  "full": "Advanced Data Structures"},
                {"short": "JAVA", "full": "Java Programming"},
                {"short": "SBT",  "full": ""},
                {"short": "SEM",  "full": "Seminar"},
                {"short": "AMCS", "full": "Applied Mathematics"}
            ],
            "schedule": {
                "Monday":    ["ADS", "JAVA", "SEM"],
                "Tuesday":   ["ADS", "JAVA", "SEM"],
                "Wednesday": ["ADS", "SBT",  "SEM"],
                "Thursday":  ["JAVA", "SBT"],
                "Friday":    ["SBT", "JAVA"]
            },
            "raw_text": "Mock response"
        }

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = """Look at this timetable image.

TASK:
1. Find the Subject-Staff legend in the image (usually at the bottom)
2. Extract every unique subject abbreviation from the timetable grid
3. Map each abbreviation to its full subject name using the legend
4. Identify whether each subject is THEORY or PRACTICAL
5. Extract the day-wise schedule

HOW TO IDENTIFY PRACTICALS:
- Entries like "S1-CNL-SBT-507", "S2-PDL-I-TGM-502" mean batch practical sessions
  (S1/S2/S3 = student batches, the subject code is between the first and second dash)
- Subject codes ending in "-I" or "-II" are usually practicals (e.g. PDL-I, CNL)
- Entries with room numbers like 502, 507, 508 in batch format are practicals
- Regular single entries like "ADS MPN 505" or "PROGG. IN JAVA AGS 505" are theory

STRICT RULES:
- Return ONLY JSON. Start with { and end with }. No explanation, no markdown.
- In "S1-ADASL-MPN-503": ADASL is subject, MPN is staff, 503 is room — only include ADASL
- DO NOT include staff initials as subjects (FKS, NKS, MPN, AGS, TGM, SBT, SNZ, BSZ, SND, GFM)
- DO NOT include: LIBRARY, COUNSELLING, BATCH COUNSELLING, BREAK, MINOR, VSB, CCRP
- If full name found in legend, use it. Otherwise leave full as ""
- For type: use "Theory" or "Practical"

JSON format (return exactly this structure):
{
  "abbreviations": [
    {"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"},
    {"short": "PROGG", "full": "Programming in Java",                     "type": "Theory"},
    {"short": "DCCN",  "full": "Data Communication and Computer Networks","type": "Theory"},
    {"short": "AMCS",  "full": "Applied Mathematics and Computational Statistics", "type": "Theory"},
    {"short": "SEM",   "full": "Seminar",                                 "type": "Theory"},
    {"short": "PDL",   "full": "PDL Practical",                           "type": "Practical"},
    {"short": "CNL",   "full": "Computer Networks Lab",                   "type": "Practical"}
  ],
  "schedule": {
    "Monday":    ["ADASL", "PROGG", "SEM"],
    "Tuesday":   ["ADASL", "PROGG", "DCCN", "CNL"],
    "Wednesday": ["PROGG", "AMCS", "SEM", "PDL"],
    "Thursday":  ["ADASL", "DCCN", "SEM"],
    "Friday":    ["PROGG", "PDL", "CNL"]
  },
  "raw_text": "full raw text from the image"
}"""

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"}
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }
        ],
        max_tokens=1024,
        temperature=0.0
    )

    raw = response.choices[0].message.content.strip()

    # ── Attempt 1: strip markdown fences and parse directly ──────────────────
    parsed = None
    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        pass

    # ── Attempt 2: extract first {...} block (handles leading/trailing text) ─
    if not parsed:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    # ── Attempt 3: the JSON is inside raw_text as an escaped string ──────────
    if not parsed:
        try:
            unescaped = raw.encode().decode('unicode_escape')
            match = re.search(r'\{.*\}', unescaped, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
        except Exception:
            pass

    if not parsed:
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": raw,
            "error": "Could not parse response."
        }

    # ── Clean up junk abbreviations before returning ─────────────────────────
    parsed['abbreviations'] = clean_abbreviations(
        parsed.get('abbreviations', [])
    )

    return parsed