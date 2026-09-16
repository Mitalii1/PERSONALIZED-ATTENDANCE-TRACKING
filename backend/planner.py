"""Exact attendance-planning calculations, independent of Flask and MySQL."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from fractions import Fraction
from math import ceil, floor
from typing import Optional

DEFAULT_THRESHOLD_PERCENT = 75


def _threshold(percent: int | float) -> Fraction:
    return Fraction(percent).limit_denominator(10_000) / 100


def percentage(attended: int, held: int) -> float:
    if held <= 0:
        return 0.0
    return round(float(Fraction(attended, held) * 100), 2)


def skips_available(
    attended: int,
    held: int,
    threshold_percent: int | float = DEFAULT_THRESHOLD_PERCENT,
) -> int:
    threshold = _threshold(threshold_percent)
    if threshold <= 0:
        return 10**6
    return max(0, floor(Fraction(attended) / threshold - held))


def classes_to_recover(
    attended: int,
    held: int,
    threshold_percent: int | float = DEFAULT_THRESHOLD_PERCENT,
) -> int:
    threshold = _threshold(threshold_percent)
    if threshold >= 1:
        return 0 if attended == held else -1
    needed = (threshold * held - attended) / (1 - threshold)
    return max(0, ceil(needed))


def best_possible_percentage(attended: int, held: int, remaining: int) -> float:
    return percentage(attended + remaining, held + remaining)


def term_skip_budget(
    attended: int,
    held: int,
    remaining: int,
    threshold_percent: int | float = DEFAULT_THRESHOLD_PERCENT,
) -> int:
    threshold = _threshold(threshold_percent)
    possible_misses = Fraction(attended + remaining) - threshold * (held + remaining)
    return max(0, min(remaining, floor(possible_misses)))


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


def _message(status: str, code: str, budget: int, recover: int, best: float) -> str:
    if status == "unrecoverable":
        return (
            f"Even with a clean sheet from here, {code} tops out at {best}%. "
            "Talk to the department about a condonation or a make-up option."
        )
    if status == "at_risk":
        if recover <= 0:
            return f"{code} is right on the line. Miss one and you drop below."
        return f"Attend the next {recover} {code} classes in a row to get back above the line."
    if status == "tight":
        return f"{budget} more {code} classes to spare for the whole term. Spend them carefully."
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
    status = status_band(current, budget, reachable)

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
        status=status,
        message=_message(status, code, budget, recover, best),
    )


def simulate_skip(
    plan: SubjectPlan,
    skip_count: int = 1,
    threshold_percent: Optional[int] = None,
) -> dict:
    threshold = threshold_percent or plan.threshold_percent
    held_after = plan.held + skip_count
    return {
        "skip_count": skip_count,
        "percent_after": percentage(plan.attended, held_after),
        "drops_below": percentage(plan.attended, held_after) < threshold,
        "budget_after": term_skip_budget(
            plan.attended,
            held_after,
            max(0, plan.remaining - skip_count),
            threshold,
        ),
    }
