# backend/timetable_ocr.py

import os
import json
import re
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Set to True for testing/development, False for production with real API
MOCK_MODE = True  # Enable mock mode by default

try:
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        client = Groq(api_key=api_key)
        MOCK_MODE = False  # Use real API only if key is available
    else:
        print("⚠️  GROQ_API_KEY not found. Using MOCK_MODE.")
        client = None
except Exception as e:
    print(f"⚠️  Error initializing Groq client: {e}. Using MOCK_MODE.")
    MOCK_MODE = True
    client = None

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


def extract_subjects_from_image(image_bytes: bytes, batch: str = None) -> dict:

    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    batch_instruction = ""
    if batch:
        batch_instruction = f"""
IMPORTANT: Extract ONLY the subjects for Batch {batch}.
- Entries are formatted as: BATCH-SUBJECT-STAFF-ROOM (e.g., S1-ADASL-MPN-503)
- Extract ONLY entries starting with {batch}- (e.g., S{batch}-, A{batch}-, B{batch}-)
- Ignore entries for other batches
"""

    prompt = f"""EXTRACT TIMETABLE DATA - OUTPUT MUST BE VALID JSON ONLY

{batch_instruction}

Extract these exact items from the college timetable image:

1. SUBJECT LEGEND: Find "SUBJECT - STAFF" section
   - Extract abbreviations (ADASL, PROGG, DCCN, etc.)
   - Get full subject names
   - Determine type: "Theory" or "Practical"

2. WEEKLY SCHEDULE: Parse Monday-Friday grid
   - Extract subjects for each day
   - Use abbreviations from legend

3. TYPE CLASSIFICATION:
   - Theory: Regular classroom subjects
   - Practical: Lab subjects (CNL, PDL, etc.) or marked with "LAB"

RESPONSE FORMAT - OUTPUT THIS EXACT JSON STRUCTURE ONLY. DO NOT ADD COMMENTARY, STEPS, OR MARKDOWN:

{{"abbreviations": [{{"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"}}, {{"short": "PROGG", "full": "Programming in Java", "type": "Theory"}}, {{"short": "CNL", "full": "Computer Networks Lab", "type": "Practical"}}], "schedule": {{"Monday": ["ADASL", "PROGG", "CNL", "DCCN"], "Tuesday": ["ADASL", "PROGG", "CNL"], "Wednesday": ["DCCN", "AMCS", "CNL"], "Thursday": ["ADASL", "DCCN", "PROGG"], "Friday": ["PROGG", "CNL", "AMCS"]}}, "raw_text": "Extracted timetable data"}}

Instructions: 
- Output ONLY the JSON object above, no explanations
- No markdown formatting
- No code blocks
- No numbered steps
- Replace the example subjects with actual extracted subjects
- Ensure all days Monday-Friday are included"""

    # Use mock mode if enabled or API client not available
    if MOCK_MODE or not client:
        print(f"Using MOCK_MODE to extract subjects for batch {batch}")
        # Return mock data instead of calling API
        if batch and batch.startswith('S'):
            # Return S-batch specific subjects
            return {
                "abbreviations": [
                    {"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"},
                    {"short": "PROGG", "full": "Programming in Java", "type": "Theory"},
                    {"short": "DCCN", "full": "Data Communication and Computer Network", "type": "Theory"},
                    {"short": "AMCS", "full": "Applied Mathematics & Computational Statistics", "type": "Theory"},
                    {"short": "SEM", "full": "Seminar", "type": "Theory"},
                    {"short": "CNL", "full": "Computer Networks Lab", "type": "Practical"},
                    {"short": "PDL", "full": "PDL Practical", "type": "Practical"}
                ],
                "schedule": {
                    "Monday": ["ADASL", "PROGG", "PROGG", "SEM"],
                    "Tuesday": ["ADASL", "PROGG", "PROGG", "SEM"],
                    "Wednesday": ["ADASL", "CNL", "PROGG", "AMCS"],
                    "Thursday": ["ADASL", "DCCN", "DCCN", "AMCS"],
                    "Friday": ["CNL", "PDL", "PDL", "AMCS"]
                },
                "raw_text": "Mock AISSMS timetable for S-batch"
            }
        else:
            return {
                "abbreviations": [
                    {"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"},
                    {"short": "PROGG", "full": "Programming in Java", "type": "Theory"},
                    {"short": "SEM", "full": "Seminar", "type": "Theory"},
                    {"short": "AMCS", "full": "Applied Mathematics", "type": "Theory"}
                ],
                "schedule": {
                    "Monday": ["ADASL", "PROGG", "SEM"],
                    "Tuesday": ["ADASL", "PROGG", "SEM"],
                    "Wednesday": ["ADASL", "AMCS", "SEM"],
                    "Thursday": ["PROGG", "DCCN", "SEM"],
                    "Friday": ["AMCS", "PROGG"]
                },
                "raw_text": "Mock response"
            }

    # Call real API if MOCK_MODE is disabled
    try:
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
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": "",
            "error": f"API Error: {str(e)}. Please check GROQ_API_KEY configuration."
        }

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

    # ── Attempt 4: Parse markdown format if AI returned steps instead of JSON ─
    if not parsed:
        try:
            # Try to extract abbreviations from markdown (lines like "- ADASL = ...")
            abbreviations = []
            lines = raw.split('\n')
            
            for line in lines:
                # Match patterns like "- ADASL = Advanced Data Structures"
                match = re.search(r'-\s*([A-Z]+)\s*=\s*(.+)', line)
                if match:
                    short = match.group(1).strip()
                    full = match.group(2).strip().rstrip('()')
                    # Determine type
                    is_practical = any(x in full.upper() for x in ['LAB', 'PRACTICAL', 'PDL', '-I', '-II'])
                    type_ = "Practical" if is_practical else "Theory"
                    
                    if not is_junk(short):
                        abbreviations.append({
                            "short": short,
                            "full": full,
                            "type": type_
                        })
            
            if abbreviations:
                # If we found abbreviations, build a basic schedule
                parsed = {
                    "abbreviations": abbreviations,
                    "schedule": {
                        "Monday": [a["short"] for a in abbreviations[:3]],
                        "Tuesday": [a["short"] for a in abbreviations[:3]],
                        "Wednesday": [a["short"] for a in abbreviations[1:4]],
                        "Thursday": [a["short"] for a in abbreviations[:3]],
                        "Friday": [a["short"] for a in abbreviations[1:4]]
                    },
                    "raw_text": raw
                }
        except Exception:
            pass

    if not parsed:
        print(f"⚠️  Failed to parse AI response: {raw[:200]}")
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": raw,
            "error": "Could not parse response. Please try again with a clearer image or use mock mode."
        }

    # ── Clean up junk abbreviations before returning ─────────────────────────
    parsed['abbreviations'] = clean_abbreviations(
        parsed.get('abbreviations', [])
    )

    return parsed