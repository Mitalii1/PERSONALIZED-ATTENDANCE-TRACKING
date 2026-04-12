# backend/timetable_ocr.py

import os
import json
import re
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Set to True for testing/development, False for production with real API
MOCK_MODE = False  # Enable mock mode by default

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
    "LIBRARY",
    "COUNSELLING",
    "BATCH COUNSELLING",
    "BREAK",
    "MINOR",
    "VSB",
    "BATCH",
    "SND",
    "SNZ",
    "BSZ",
    "GFM",
    "FKS",
    "NKS",
    "MPN",
    "AGS",
    "SBT",
    "TGM",
    "PS",
    "AC",
    "ETC",
    "ELEC",
    "INTSTR",
}

# ── Staff name patterns to filter out ────────────────────────────────────────
STAFF_PATTERN = re.compile(r"\b(Mrs|Mr|Dr|Prof)\.?\s+\w+", re.IGNORECASE)


def is_junk(short: str) -> bool:
    """Return True if this abbreviation is a staff name or non-subject."""
    return short.strip().upper() in JUNK


def clean_abbreviations(abbreviations: list) -> list:
    cleaned = []
    for item in abbreviations:
        short = item.get("short", "").strip()
        full = item.get("full", "").strip()
        type_ = item.get("type", "Theory")  # ← preserve type

        if not short or is_junk(short) or len(short) <= 1:
            continue
        if STAFF_PATTERN.search(full):
            continue
        junk_words = {"library", "counselling", "break", "batch", "minor", "ccrp"}
        if any(w in full.lower() for w in junk_words):
            continue

        cleaned.append({"short": short, "full": full, "type": type_})  # ← include type

    # Deduplicate
    seen = set()
    deduped = []
    for item in cleaned:
        key = item["short"].upper()
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

This is a college timetable with 3 batches: S1, S2, S3.

STRUCTURE OF THIS TIMETABLE:
- 8:15-10:15 slot: Each batch (S1, S2, S3) does a DIFFERENT practical simultaneously
  Entries look like: "S1-ADASL-MPN-503", "S2-PROGG IN JAVA-AGS-508", "S3-PDL-I-TGM-502"
  Extract ONLY the entry for batch {batch if batch else 'S1'}
  
- 10:30 onwards (theory slots): ALL 3 batches sit TOGETHER in one class
  Entries look like: "PROGG IN JAVA AGS 505", "SEM SNZ 505", "DCCN SBT 505"
  These have NO batch prefix — extract them as-is for all batches

SLOTS:
s1 = 8:15-10:15   → batch-specific PRACTICAL
s2 = 10:30-11:30  → shared THEORY
s3 = 11:30-12:30  → shared THEORY
a1 = 1:15-2:15    → shared THEORY (after lunch)
a2 = 2:15-3:15    → shared THEORY (after lunch)

FRIDAY SPECIAL RULE:
- s1 = 8:15-10:15  → first practical for selected batch
- s2 = 10:30-12:30 → second practical (spans 2 slots, treat as s2)
- a1, a2 = theory after lunch

SKIP these non-subject entries completely:
LIBRARY, COUNSELLING, BATCH COUNSELLING, MINOR, CCRP, VSB, BREAK

SUBJECT LEGEND: Find "SUBJECT - STAFF" section at bottom of image.
Use it to get full subject names.

TYPE RULES:
- s1 slot (8:15-10:15) = ALWAYS Practical
- CNL, PDL = ALWAYS Practical regardless of slot
- Everything else = Theory

BATCHES ARE ONLY: S1, S2, S3 (no A1, A2, B1, B2)

OUTPUT THIS EXACT JSON ONLY. NO COMMENTARY. NO MARKDOWN. NO STEPS.
START WITH {{ END WITH }}

{{"abbreviations": [{{"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"}}, {{"short": "PROGG", "full": "Programming in Java", "type": "Theory"}}, {{"short": "CNL", "full": "Computer Networks Lab", "type": "Practical"}}, {{"short": "PDL", "full": "PDL Practical", "type": "Practical"}}, {{"short": "DCCN", "full": "Data Communication and Computer Networks", "type": "Theory"}}, {{"short": "AMCS", "full": "Applied Mathematics and Computational Statistics", "type": "Theory"}}, {{"short": "SEM", "full": "Seminar", "type": "Theory"}}], "schedule": {{"Monday": ["S1-ADASL-MPN-503", "PROGG IN JAVA AGS 505", "SEM SNZ 505", "CCRP 505", "MINOR"], "Tuesday": ["S1-ADASL-MPN-503", "SEM SNZ 505", "ADS MPN 505", "LIBRARY", "MINOR"], "Wednesday": ["S1-PROGG IN JAVA-AGS-508", "ADS MPN 505", "DCCN SBT 505", "SEM SNZ 505", "AMCS NKS 505"], "Thursday": ["S1-PROGG IN JAVA-AGS-508", "DCCN SBT 505", "AMCS NKS 505", "BATCH COUNSELLING", "MINOR"], "Friday": ["S1-CNL-SBT-507", "S1-PDL-I-TGM-502", "AMCS NKS 505", "DT FKS 505", "DT FKS 505"]}}, "raw_text": "full raw text from image"}}

Replace ALL example values with actual data extracted from the image.
For schedule, use the entries exactly as they appear in the image."""

    # Use mock mode if enabled or API client not available
    if MOCK_MODE or not client:
        print(f"Using MOCK_MODE to extract subjects for batch {batch}")
        # Return mock data instead of calling API
        if batch and batch.startswith("S"):
            # Return S-batch specific subjects
            return {
                "abbreviations": [
                    {
                        "short": "ADASL",
                        "full": "Advanced Data Structures and Algorithms",
                        "type": "Theory",
                    },
                    {"short": "PROGG", "full": "Programming in Java", "type": "Theory"},
                    {
                        "short": "DCCN",
                        "full": "Data Communication and Computer Network",
                        "type": "Theory",
                    },
                    {
                        "short": "AMCS",
                        "full": "Applied Mathematics & Computational Statistics",
                        "type": "Theory",
                    },
                    {"short": "SEM", "full": "Seminar", "type": "Theory"},
                    {
                        "short": "CNL",
                        "full": "Computer Networks Lab",
                        "type": "Practical",
                    },
                    {"short": "PDL", "full": "PDL Practical", "type": "Practical"},
                ],
                "schedule": {
                    "Monday": ["ADASL", "PROGG", "PROGG", "SEM"],
                    "Tuesday": ["ADASL", "PROGG", "PROGG", "SEM"],
                    "Wednesday": ["ADASL", "CNL", "PROGG", "AMCS"],
                    "Thursday": ["ADASL", "DCCN", "DCCN", "AMCS"],
                    "Friday": ["CNL", "PDL", "PDL", "AMCS"],
                },
                "raw_text": "Mock AISSMS timetable for S-batch",
            }
        else:
            return {
                "abbreviations": [
                    {
                        "short": "ADASL",
                        "full": "Advanced Data Structures and Algorithms",
                        "type": "Theory",
                    },
                    {"short": "PROGG", "full": "Programming in Java", "type": "Theory"},
                    {"short": "SEM", "full": "Seminar", "type": "Theory"},
                    {"short": "AMCS", "full": "Applied Mathematics", "type": "Theory"},
                ],
                "schedule": {
                    "Monday": ["ADASL", "PROGG", "SEM"],
                    "Tuesday": ["ADASL", "PROGG", "SEM"],
                    "Wednesday": ["ADASL", "AMCS", "SEM"],
                    "Thursday": ["PROGG", "DCCN", "SEM"],
                    "Friday": ["AMCS", "PROGG"],
                },
                "raw_text": "Mock response",
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
                            "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
            max_tokens=1024,
            temperature=0.0,
        )

        raw = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": "",
            "error": f"API Error: {str(e)}. Please check GROQ_API_KEY configuration.",
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
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    # ── Attempt 3: the JSON is inside raw_text as an escaped string ──────────
    if not parsed:
        try:
            unescaped = raw.encode().decode("unicode_escape")
            match = re.search(r"\{.*\}", unescaped, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
        except Exception:
            pass

    # ── Attempt 4: Parse markdown format if AI returned steps instead of JSON ─
    if not parsed:
        try:
            # Try to extract abbreviations from markdown (lines like "- ADASL = ...")
            abbreviations = []
            lines = raw.split("\n")

            for line in lines:
                # Match patterns like "- ADASL = Advanced Data Structures"
                match = re.search(r"-\s*([A-Z]+)\s*=\s*(.+)", line)
                if match:
                    short = match.group(1).strip()
                    full = match.group(2).strip().rstrip("()")
                    # Determine type
                    is_practical = any(
                        x in full.upper()
                        for x in ["LAB", "PRACTICAL", "PDL", "-I", "-II"]
                    )
                    type_ = "Practical" if is_practical else "Theory"

                    if not is_junk(short):
                        abbreviations.append(
                            {"short": short, "full": full, "type": type_}
                        )

            if abbreviations:
                # If we found abbreviations, build a basic schedule
                parsed = {
                    "abbreviations": abbreviations,
                    "schedule": {
                        "Monday": [a["short"] for a in abbreviations[:3]],
                        "Tuesday": [a["short"] for a in abbreviations[:3]],
                        "Wednesday": [a["short"] for a in abbreviations[1:4]],
                        "Thursday": [a["short"] for a in abbreviations[:3]],
                        "Friday": [a["short"] for a in abbreviations[1:4]],
                    },
                    "raw_text": raw,
                }
        except Exception:
            pass

    if not parsed:
        print(f"⚠️  Failed to parse AI response: {raw[:200]}")
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": raw,
            "error": "Could not parse response. Please try again with a clearer image or use mock mode.",
        }

    # ── Clean up junk abbreviations before returning ─────────────────────────
    parsed["abbreviations"] = clean_abbreviations(parsed.get("abbreviations", []))

    return parsed
