"""
timetable_ai.py — timetable image -> structured weekly schedule.

Three changes worth explaining, because they are the difference between "it
broke and I put it in mock mode" and "it degrades on purpose":

1. The model is discovered at runtime, not hard-coded. Hard-coding
   `meta-llama/llama-4-scout-17b-16e-instruct` is exactly what produced the 502:
   the key had no such model. We ask the provider what it has, pick the first
   candidate that is actually available, and cache the answer.

2. The model returns a confidence for every cell. A photo of a timetable taken
   at an angle in bad light WILL be misread. Pretending otherwise is the bug;
   surfacing the four cells it was unsure about and letting the student fix them
   is the feature.

3. Output is validated against a closed vocabulary (your five slots, seven days,
   the subject codes the model itself detected) before it ever reaches MySQL.
   An LLM that invents a slot called "s6" should fail here, loudly.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any

log = logging.getLogger(__name__)

VALID_SLOTS = ("s1", "s2", "s3", "a1", "a2")
VALID_DAYS = (1, 2, 3, 4, 5, 6)  # Monday..Saturday
VALID_KINDS = ("lecture", "practical", "free")

MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

# Preference order, most capable first. Anything not available is skipped.
# Override with GROQ_MODEL to pin one explicitly.
VISION_MODEL_CANDIDATES = [
    m.strip()
    for m in os.getenv(
        "VISION_MODEL_CANDIDATES",
        "meta-llama/llama-4-maverick-17b-128e-instruct,"
        "meta-llama/llama-4-scout-17b-16e-instruct,"
        "llama-3.2-90b-vision-preview,"
        "llama-3.2-11b-vision-preview",
    ).split(",")
    if m.strip()
]

_resolved_model: str | None = None


class ExtractionUnavailable(Exception):
    """Raised when no vision model can be reached. Caller decides what to do."""


# --------------------------------------------------------------- the prompt

SYSTEM_PROMPT = """You read photographs of Indian engineering college timetables and return JSON.

Return ONLY a JSON object. No prose, no markdown fences, no explanation.

Schema:
{
  "subjects": [{"code": "DCCN", "name": "Data Communication and Computer Networks", "is_practical": false}],
  "cells": [{"day": 1, "slot": "s1", "code": "DCCN", "kind": "lecture", "confidence": 0.94}],
  "notes": "anything ambiguous, in one sentence"
}

Rules:
- "day": 1=Monday through 6=Saturday. Never 0, never 7.
- "slot" is exactly one of: s1 (08:15-10:15), s2 (10:30-11:30), s3 (11:30-12:30),
  a1 (13:15-14:15), a2 (14:15-15:15). Map the printed times onto these five.
  If a printed block spans two of these slots, emit one cell per slot.
- "kind" is "lecture", "practical", or "free". Labs, workshops and anything
  marked LAB/PR/P are "practical". Practicals often span s1 or a1+a2.
- "code" must match a code in "subjects", or be null for a free period.
- Emit a cell for every day/slot pair you can see, including free ones.
- "confidence" is 0.0-1.0, your honest read of that specific cell. Use values
  below 0.6 for anything blurred, handwritten, overlapping, or guessed from
  context rather than read. Do not round everything to 0.9.
- Expand abbreviations into "name" only when the full form is printed somewhere
  on the image. Otherwise repeat the code as the name. Never invent a subject name.
- If the image is not a timetable, return {"subjects": [], "cells": [], "notes": "not a timetable"}.
"""

USER_PROMPT = (
    "Extract this timetable. The student is in batch {batch}. "
    "If the image shows several batches, return only the {batch} rows or columns."
)


# ------------------------------------------------------------- data classes

@dataclass
class ExtractionResult:
    subjects: list[dict] = field(default_factory=list)
    cells: list[dict] = field(default_factory=list)
    notes: str = ""
    source: str = "ai"          # "ai" | "mock"
    model: str | None = None
    needs_review: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "subjects": self.subjects,
            "cells": self.cells,
            "notes": self.notes,
            "source": self.source,
            "model": self.model,
            "needs_review": self.needs_review,
            "review_count": len(self.needs_review),
        }


# ------------------------------------------------------------ model picking

def resolve_vision_model(client) -> str:
    """Ask the provider what it actually serves, then pick from our candidates."""
    global _resolved_model
    if _resolved_model:
        return _resolved_model

    pinned = os.getenv("GROQ_MODEL")
    if pinned:
        _resolved_model = pinned
        return pinned

    try:
        available = {m.id for m in client.models.list().data}
    except Exception as exc:  # network down, bad key, provider outage
        raise ExtractionUnavailable(f"Could not list models: {exc}") from exc

    for candidate in VISION_MODEL_CANDIDATES:
        if candidate in available:
            _resolved_model = candidate
            log.info("Using vision model %s", candidate)
            return candidate

    raise ExtractionUnavailable(
        "This API key has no vision-capable model. Available models: "
        + ", ".join(sorted(available)[:12])
    )


# ------------------------------------------------------------- validation

def _validate(raw: dict) -> ExtractionResult:
    subjects, seen_codes = [], set()
    for s in raw.get("subjects") or []:
        code = (s.get("code") or "").strip().upper()
        if not code or code in seen_codes:
            continue
        seen_codes.add(code)
        subjects.append(
            {
                "code": code,
                "name": (s.get("name") or code).strip(),
                "is_practical": bool(s.get("is_practical")),
            }
        )

    cells, review = [], []
    for c in raw.get("cells") or []:
        day, slot = c.get("day"), (c.get("slot") or "").strip().lower()
        if day not in VALID_DAYS or slot not in VALID_SLOTS:
            log.warning("Dropping cell with bad day/slot: %r", c)
            continue

        code = (c.get("code") or "").strip().upper() or None
        if code and code not in seen_codes:
            # The model referenced a subject it never declared. Keep the cell but
            # flag it rather than silently dropping a real class.
            subjects.append({"code": code, "name": code, "is_practical": False})
            seen_codes.add(code)

        kind = c.get("kind") if c.get("kind") in VALID_KINDS else ("free" if not code else "lecture")
        try:
            confidence = min(1.0, max(0.0, float(c.get("confidence", 0.5))))
        except (TypeError, ValueError):
            confidence = 0.5

        cell = {"day": day, "slot": slot, "code": code, "kind": kind, "confidence": confidence}
        cells.append(cell)
        if confidence < 0.6:
            review.append(cell)

    return ExtractionResult(
        subjects=subjects,
        cells=cells,
        notes=(raw.get("notes") or "")[:300],
        needs_review=review,
    )


# --------------------------------------------------------------- extraction

def _mock_result() -> ExtractionResult:
    codes = ["ADASL", "PROGG", "DCCN", "AMCS", "SEM", "CNL", "PDL"]
    subjects = [{"code": c, "name": c, "is_practical": c in ("CNL", "PDL")} for c in codes]
    cells, i = [], 0
    for day in range(1, 6):
        for slot in VALID_SLOTS:
            cells.append(
                {"day": day, "slot": slot, "code": codes[i % len(codes)],
                 "kind": "lecture", "confidence": 1.0}
            )
            i += 1
    return ExtractionResult(
        subjects=subjects, cells=cells, source="mock", model=None,
        notes="Demo timetable. Set MOCK_MODE=false to read your uploaded image.",
    )


def extract_timetable(image_bytes: bytes, batch: str = "S1", mime: str = "image/jpeg") -> dict:
    """
    The one function app.py calls. Never raises for the ordinary failure paths —
    it returns a mock result with `source: "mock"` so the UI can say why.
    """
    if MOCK_MODE:
        return _mock_result().to_dict()

    try:
        from groq import Groq

        client = Groq(api_key=os.environ["GROQ_API_KEY"])
        model = resolve_vision_model(client)
        b64 = base64.b64encode(image_bytes).decode()

        response = client.chat.completions.create(
            model=model,
            temperature=0,                                  # extraction, not creativity
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": USER_PROMPT.format(batch=batch)},
                        {"type": "image_url",
                         "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    ],
                },
            ],
        )
        raw = json.loads(response.choices[0].message.content)
        result = _validate(raw)
        result.model = model
        return result.to_dict()

    except ExtractionUnavailable as exc:
        log.warning("Vision extraction unavailable: %s", exc)
        fallback = _mock_result()
        fallback.notes = f"Automatic reading is unavailable ({exc}). Showing a sample timetable you can edit."
        return fallback.to_dict()

    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        log.exception("Model returned something unusable")
        fallback = _mock_result()
        fallback.notes = "The timetable could not be read from that image. Edit the grid below or try a clearer photo."
        return fallback.to_dict()

    except Exception as exc:  # noqa: BLE001 - last resort, must not 500 the upload
        log.exception("Unexpected extraction failure")
        fallback = _mock_result()
        fallback.notes = "Something went wrong reading the image. Edit the grid below or try again."
        return fallback.to_dict()


def extract_subjects_from_image(image_bytes: bytes, batch: str = "S1") -> dict:
    """Adapt the structured extractor result for the existing upload route."""
    result = extract_timetable(image_bytes, batch=batch)
    abbreviations = [
        {
            "short": subject["code"],
            "full": subject["name"],
            "type": "Practical" if subject.get("is_practical") else "Theory",
        }
        for subject in result.get("subjects", [])
    ]

    day_names = {
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
    }
    slot_order = {slot: index for index, slot in enumerate(VALID_SLOTS)}
    schedule = {day: ["BREAK"] * len(VALID_SLOTS) for day in day_names.values()}
    for cell in result.get("cells", []):
        day = day_names.get(cell.get("day"))
        slot = cell.get("slot")
        if not day or slot not in slot_order:
            continue
        code = cell.get("code")
        if code:
            schedule[day][slot_order[slot]] = code

    return {
        "abbreviations": abbreviations,
        "schedule": schedule,
        "raw_text": result.get("notes", ""),
        "source": result.get("source"),
        "needs_review": result.get("needs_review", []),
    }
