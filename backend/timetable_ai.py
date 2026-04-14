# backend/timetable_ai.py

import os
import json
import re
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

MOCK_MODE = False

try:
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        client = Groq(api_key=api_key)
        MOCK_MODE = False
    else:
        print("⚠️  GROQ_API_KEY not found. Using MOCK_MODE.")
        client = None
        MOCK_MODE = True
except Exception as e:
    print(f"⚠️  Error initializing Groq client: {e}. Using MOCK_MODE.")
    MOCK_MODE = True
    client = None

# ── Junk entries that are never subjects ─────────────────────────────────────
JUNK = {
    "LIBRARY", "COUNSELLING", "BATCH COUNSELLING", "BREAK",
    "MINOR", "VSB", "BATCH", "SND", "SNZ", "BSZ",
    "GFM", "FKS", "NKS", "MPN", "AGS", "SBT",
    "TGM", "PS", "AC", "ETC", "ELEC", "INTSTR", "CCRP", "DT",
}

STAFF_PATTERN = re.compile(r"\b(Mrs|Mr|Dr|Prof)\.?\s+\w+", re.IGNORECASE)


def is_junk(short: str) -> bool:
    return short.strip().upper() in JUNK


def clean_abbreviations(abbreviations: list) -> list:
    cleaned = []
    for item in abbreviations:
        short = item.get("short", "").strip()
        full  = item.get("full",  "").strip()
        type_ = item.get("type", "Theory")

        if not short or is_junk(short) or len(short) <= 1:
            continue
        if STAFF_PATTERN.search(full):
            continue
        junk_words = {"library", "counselling", "break", "batch", "minor", "ccrp"}
        if any(w in full.lower() for w in junk_words):
            continue

        cleaned.append({"short": short, "full": full, "type": type_})

    # Deduplicate by short code
    seen = set()
    deduped = []
    for item in cleaned:
        key = item["short"].upper()
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return deduped


def extract_subjects_from_image(image_bytes: bytes, batch: str = None) -> dict:

    # ── Mock mode ─────────────────────────────────────────────────────────────
    if MOCK_MODE or not client:
        print(f"Using MOCK_MODE for batch {batch}")
        return {
            "abbreviations": [
                {"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"},
                {"short": "PROGG", "full": "Programming in Java",                     "type": "Theory"},
                {"short": "DCCN",  "full": "Data Communication and Computer Network", "type": "Theory"},
                {"short": "AMCS",  "full": "Applied Mathematics & Computational Statistics", "type": "Theory"},
                {"short": "SEM",   "full": "Seminar",                                 "type": "Theory"},
                {"short": "CNL",   "full": "Computer Networks Lab",                   "type": "Practical"},
                {"short": "PDL",   "full": "PDL Practical",                           "type": "Practical"},
            ],
            "schedule": {
                "Monday":    ["S1-ADASL-MPN-503",       "PROGG IN JAVA AGS 505", "SEM SNZ 505",   "CCRP 505",           "MINOR"],
                "Tuesday":   ["S1-ADASL-MPN-503",       "SEM SNZ 505",           "ADS MPN 505",   "LIBRARY",            "MINOR"],
                "Wednesday": ["S1-PROGG IN JAVA-AGS-508","ADS MPN 505",           "DCCN SBT 505",  "SEM SNZ 505",        "AMCS NKS 505"],
                "Thursday":  ["S1-PROGG IN JAVA-AGS-508","DCCN SBT 505",          "AMCS NKS 505",  "BATCH COUNSELLING",  "MINOR"],
                "Friday":    ["S1-CNL-SBT-507",          "S1-PDL-I-TGM-502"],
            },
            "raw_text": "Mock timetable for S1 batch",
        }

    # ── Build prompt ──────────────────────────────────────────────────────────
    selected_batch = batch if batch else "S1"

    prompt = f"""EXTRACT TIMETABLE DATA - OUTPUT MUST BE VALID JSON ONLY

This is a college timetable with 3 batches: S1, S2, S3.

STRUCTURE OF THIS TIMETABLE:
- 8:15-10:15 slot: Each batch does a DIFFERENT practical simultaneously
  Entries: "S1-ADASL-MPN-503", "S2-PROGG IN JAVA-AGS-508", "S3-PDL-I-TGM-502"
  Extract ONLY the entry for batch {selected_batch}

- 10:30 onwards (theory slots): ALL 3 batches sit TOGETHER
  Entries: "PROGG IN JAVA AGS 505", "SEM SNZ 505", "DCCN SBT 505"
  These have NO batch prefix

SLOTS:
s1 = 8:15-10:15   batch-specific PRACTICAL
s2 = 10:30-11:30  shared THEORY
s3 = 11:30-12:30  shared THEORY
a1 = 1:15-2:15    shared THEORY after lunch
a2 = 2:15-3:15    shared THEORY after lunch

FRIDAY SPECIAL: s1 = first practical, s2 = second practical (spans 10:30-12:30)

SKIP COMPLETELY: LIBRARY, COUNSELLING, BATCH COUNSELLING, MINOR, CCRP, VSB, BREAK, DT

TYPE RULES:
- s1 slot = ALWAYS Practical
- CNL and PDL = ALWAYS Practical
- Everything else = Theory

SUBJECT LEGEND is at the bottom of the image — use it for full subject names.
BATCHES ARE ONLY S1, S2, S3.

OUTPUT RULES — VERY IMPORTANT:
- Output ONLY the JSON object
- Do NOT use markdown code fences like ```json
- Do NOT add any explanation, steps, or commentary
- Start your response with {{ and end with }}

{{"abbreviations": [{{"short": "ADASL", "full": "Advanced Data Structures and Algorithms", "type": "Theory"}}, {{"short": "PROGG", "full": "Programming in Java", "type": "Theory"}}, {{"short": "CNL", "full": "Computer Networks Lab", "type": "Practical"}}, {{"short": "PDL", "full": "PDL Practical", "type": "Practical"}}, {{"short": "DCCN", "full": "Data Communication and Computer Networks", "type": "Theory"}}, {{"short": "AMCS", "full": "Applied Mathematics and Computational Statistics", "type": "Theory"}}, {{"short": "SEM", "full": "Seminar", "type": "Theory"}}], "schedule": {{"Monday": ["S1-ADASL-MPN-503", "PROGG IN JAVA AGS 505", "SEM SNZ 505", "CCRP 505", "MINOR"], "Tuesday": ["S1-ADASL-MPN-503", "SEM SNZ 505", "ADS MPN 505", "LIBRARY", "MINOR"], "Wednesday": ["S1-PROGG IN JAVA-AGS-508", "ADS MPN 505", "DCCN SBT 505", "SEM SNZ 505", "AMCS NKS 505"], "Thursday": ["S1-PROGG IN JAVA-AGS-508", "DCCN SBT 505", "AMCS NKS 505", "BATCH COUNSELLING", "MINOR"], "Friday": ["S1-CNL-SBT-507", "S1-PDL-I-TGM-502", "AMCS NKS 505", "DT FKS 505", "DT FKS 505"]}}, "raw_text": "full raw text from image"}}

Replace ALL example values with actual data from the image."""

    # ── Call Groq API ─────────────────────────────────────────────────────────
    try:
        image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

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
            max_tokens=2048,
            temperature=0.0,
        )

        raw = response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": "",
            "error": f"API Error: {str(e)}",
        }

    # ── Parse the response ────────────────────────────────────────────────────
    parsed = None

    # Attempt 1: strip ```json fences then parse directly
    try:
        clean = re.sub(r'```json\s*', '', raw)
        clean = re.sub(r'```\s*', '', clean)
        clean = clean.strip()
        parsed = json.loads(clean)
    except json.JSONDecodeError:
        pass

    # Attempt 2: extract first { ... } block from anywhere in response
    if not parsed:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group())
            except json.JSONDecodeError:
                pass

    # Attempt 3: unescape unicode then extract JSON block
    if not parsed:
        try:
            unescaped = raw.encode().decode('unicode_escape')
            match = re.search(r'\{.*\}', unescaped, re.DOTALL)
            if match:
                parsed = json.loads(match.group())
        except Exception:
            pass

    # Attempt 4: extract abbreviations from markdown lines like "- ADASL = ..."
    if not parsed:
        try:
            abbreviations = []
            for line in raw.split("\n"):
                match = re.search(r"-\s*([A-Z]+)\s*=\s*(.+)", line)
                if match:
                    short = match.group(1).strip()
                    full  = match.group(2).strip().rstrip("()")
                    is_practical = any(
                        x in full.upper() for x in ["LAB", "PRACTICAL", "PDL", "-I", "-II"]
                    )
                    type_ = "Practical" if is_practical else "Theory"
                    if not is_junk(short):
                        abbreviations.append({"short": short, "full": full, "type": type_})

            if abbreviations:
                parsed = {
                    "abbreviations": abbreviations,
                    "schedule": {
                        "Monday":    [a["short"] for a in abbreviations[:3]],
                        "Tuesday":   [a["short"] for a in abbreviations[:3]],
                        "Wednesday": [a["short"] for a in abbreviations[1:4]],
                        "Thursday":  [a["short"] for a in abbreviations[:3]],
                        "Friday":    [a["short"] for a in abbreviations[1:4]],
                    },
                    "raw_text": raw,
                }
        except Exception:
            pass

    # All attempts failed
    if not parsed:
        print(f"⚠️  Failed to parse AI response: {raw[:300]}")
        return {
            "abbreviations": [],
            "schedule": {},
            "raw_text": raw,
            "error": "Could not parse AI response. Try a clearer image.",
        }

    # Clean up junk abbreviations
    parsed["abbreviations"] = clean_abbreviations(parsed.get("abbreviations", []))
    return parsed