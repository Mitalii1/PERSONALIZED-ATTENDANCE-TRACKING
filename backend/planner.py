"""
planner.py — attendance budget maths.

Deliberately has zero Flask and zero database imports. Everything here is a pure
function over integers, which means it is trivially unit-testable and impossible
to break by changing the schema.

All percentages are handled as exact Fractions internally. Floats look harmless
until a student sitting at exactly 75.0% is told they are at 74.999% and panics.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from fractions import Fraction
from math import floor, ceil
from typing import Optional

DEFAULT_THRESHOLD_PERCENT = 75

# Attendance rows with these statuses are NOT counted as classes held.
# A class the lecturer cancelled should never damage a student's percentage.
NON_HELD_STATUSES = ("cancelled", "holiday")


def _threshold(percent: int | float) -> Fraction:
    return Fraction(percent).limit_denominator(10_000) / 100


def percentage(attended: int, held: int) -> float:
    """Plain attendance percentage, rounded to 2dp. 0 held classes -> 0.0."""
    if held <= 0:
        return 0.0
    return round(float(Fraction(attended, held) * 100), 2)


def skips_available(attended: int, held: int, threshold_percent=DEFAULT_THRESHOLD_PERCENT) -> int:
    """
    How many of the *next* classes you can miss and still finish >= threshold.

        (attended) / (held + k) >= p   =>   k <= attended/p - held
    """
    p = _threshold(threshold_percent)
    if p <= 0:
        return 10**6  # effectively unlimited
    k = Fraction(attended) / p - held
    return max(0, floor(k))


def classes_to_recover(attended: int, held: int, threshold_percent=DEFAULT_THRESHOLD_PERCENT) -> int:
    """
    How many classes in a row you must attend to climb back to the threshold.

        (attended + n) / (held + n) >= p   =>   n >= (p*held - attended) / (1 - p)
    """
    p = _threshold(threshold_percent)
    if p >= 1:
        return 0 if attended == held else -1  # -1 == impossible
    n = (p * held - attended) / (1 - p)
    return max(0, ceil(n))


def term_skip_budget(
    attended: int,
    held: int,
    remaining: int,
    threshold_percent=DEFAULT_THRESHOLD_PERCENT,
) -> int:
    """
    The honest number. Given `remaining` classes still scheduled before the term
    ends, how many of them may you miss and still land on the threshold?

        (attended + remaining - k) / (held + remaining) >= p
    """
    p = _threshold(threshold_percent)
    k = Fraction(attended + remaining) - p * (held + remaining)
    return max(0, min(remaining, floor(k)))


def best_possible_percentage(attended: int, held: int, remaining: int) -> float:
    """Where you end up if you attend every single remaining class."""
    return percentage(attended + remaining, held + remaining)


def status_band(current: float, budget: int, reachable: bool) -> str:
    if not reachable:
        return "unrecoverable"
    if budget <= 0:
        return "at_risk"
    if budget <= 2:
        return "tight"
    return "safe"


@dataclass
class SubjectPlan:
    subject_id: int
    code: str
    name: str
    attended: int
    held: int
    remaining: int
    current_percent: float
    threshold_percent: int
    skips_now: int
    term_skip_budget: int
    classes_to_recover: int
    best_possible_percent: float
    reachable: bool
    status: str
    message: str

    def to_dict(self) -> dict:
        return asdict(self)


def _message(plan_status: str, code: str, budget: int, recover: int, best: float) -> str:
    """Interface copy lives next to the logic that decides which line applies."""
    if plan_status == "unrecoverable":
        return (
            f"Even with a clean sheet from here, {code} tops out at {best}%. "
            f"Talk to the department about a condonation or a make-up option."
        )
    if plan_status == "at_risk":
        if recover <= 0:
            return f"{code} is right on the line. Miss one and you drop below."
        return f"Attend the next {recover} {code} class{'es' if recover != 1 else ''} in a row to get back above the line."
    if plan_status == "tight":
        return f"{budget} more {code} class{'es' if budget != 1 else ''} to spare for the whole term. Spend them carefully."
    return f"{budget} {code} classes to spare before the term ends."


def build_subject_plan(
    *,
    subject_id: int,
    code: str,
    name: str,
    attended: int,
    held: int,
    remaining: int,
    threshold_percent: int = DEFAULT_THRESHOLD_PERCENT,
) -> SubjectPlan:
    current = percentage(attended, held)
    budget = term_skip_budget(attended, held, remaining, threshold_percent)
    best = best_possible_percentage(attended, held, remaining)
    reachable = best >= threshold_percent
    recover = classes_to_recover(attended, held, threshold_percent)
    band = status_band(current, budget, reachable)

    return SubjectPlan(
        subject_id=subject_id,
        code=code,
        name=name,
        attended=attended,
        held=held,
        remaining=remaining,
        current_percent=current,
        threshold_percent=threshold_percent,
        skips_now=skips_available(attended, held, threshold_percent),
        term_skip_budget=budget,
        classes_to_recover=recover,
        best_possible_percent=best,
        reachable=reachable,
        status=band,
        message=_message(band, code, budget, recover, best),
    )


def simulate_skip(
    plan: SubjectPlan,
    skip_count: int = 1,
    threshold_percent: Optional[int] = None,
) -> dict:
    """
    'What happens if I bunk tomorrow?' — answers the question the student is
    actually asking, without mutating anything.
    """
    p = threshold_percent or plan.threshold_percent
    held_after = plan.held + skip_count
    after = percentage(plan.attended, held_after)
    return {
        "skip_count": skip_count,
        "percent_after": after,
        "drops_below": after < p,
        "budget_after": term_skip_budget(
            plan.attended, held_after, max(0, plan.remaining - skip_count), p
        ),
    }
