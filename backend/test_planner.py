"""
Run with:  cd backend && python -m pytest -q

These tests are the reason the planner is a separate module. They need no
database, no Flask app, and no network.
"""

import pytest

from planner import (
    best_possible_percentage,
    build_subject_plan,
    classes_to_recover,
    percentage,
    simulate_skip,
    skips_available,
    term_skip_budget,
)


class TestPercentage:
    def test_zero_held_is_zero_not_a_crash(self):
        assert percentage(0, 0) == 0.0

    def test_exact_threshold_is_not_a_rounding_victim(self):
        # 30/40 is exactly 75%. Float maths must not report 74.99.
        assert percentage(30, 40) == 75.0


class TestSkipsAvailable:
    def test_comfortable_student(self):
        # 40/40 = 100%. Can miss 13 and still be at 40/53 = 75.47%.
        assert skips_available(40, 40) == 13

    def test_exactly_on_the_line_has_nothing_to_spare(self):
        assert skips_available(30, 40) == 0

    def test_below_the_line_returns_zero_never_negative(self):
        assert skips_available(20, 40) == 0


class TestClassesToRecover:
    def test_already_above_needs_nothing(self):
        assert classes_to_recover(38, 40) == 0

    def test_below_the_line(self):
        # 20/40 = 50%. Need n where (20+n)/(40+n) >= 0.75 -> n >= 40.
        assert classes_to_recover(20, 40) == 40

    def test_recovery_actually_reaches_the_threshold(self):
        attended, held = 17, 30
        n = classes_to_recover(attended, held)
        assert percentage(attended + n, held + n) >= 75.0
        # and one fewer would not have been enough
        assert percentage(attended + n - 1, held + n - 1) < 75.0


class TestTermBudget:
    def test_budget_never_exceeds_remaining_classes(self):
        assert term_skip_budget(50, 50, 5) == 5

    def test_budget_is_spendable_without_dropping_below(self):
        attended, held, remaining = 34, 40, 20
        k = term_skip_budget(attended, held, remaining)
        final = percentage(attended + remaining - k, held + remaining)
        assert final >= 75.0

    def test_spending_one_more_than_the_budget_breaks_the_threshold(self):
        attended, held, remaining = 34, 40, 20
        k = term_skip_budget(attended, held, remaining)
        final = percentage(attended + remaining - (k + 1), held + remaining)
        assert final < 75.0

    def test_no_remaining_classes_means_no_budget(self):
        assert term_skip_budget(20, 40, 0) == 0


class TestPlan:
    def _plan(self, attended, held, remaining):
        return build_subject_plan(
            subject_id=1, code="DCCN", name="Data Comms",
            attended=attended, held=held, remaining=remaining,
        )

    def test_healthy_subject_reads_safe(self):
        assert self._plan(38, 40, 20).status == "safe"

    def test_doomed_subject_is_flagged_unrecoverable(self):
        # 2/30 with only 5 classes left can reach at most 7/35 = 20%.
        p = self._plan(2, 30, 5)
        assert p.status == "unrecoverable"
        assert p.reachable is False
        assert best_possible_percentage(2, 30, 5) == 20.0

    def test_message_is_always_populated(self):
        for args in [(38, 40, 20), (30, 40, 10), (2, 30, 5), (0, 0, 40)]:
            assert self._plan(*args).message

    def test_fresh_term_does_not_divide_by_zero(self):
        p = self._plan(0, 0, 40)
        assert p.current_percent == 0.0
        assert p.status in {"safe", "tight", "at_risk"}


class TestSimulateSkip:
    def test_skipping_when_on_the_line_drops_you_below(self):
        p = build_subject_plan(
            subject_id=1, code="AMCS", name="Applied Maths",
            attended=30, held=40, remaining=10,
        )
        assert simulate_skip(p, 1)["drops_below"] is True

    def test_skipping_with_slack_is_safe(self):
        p = build_subject_plan(
            subject_id=1, code="AMCS", name="Applied Maths",
            attended=40, held=40, remaining=10,
        )
        assert simulate_skip(p, 1)["drops_below"] is False


@pytest.mark.parametrize("threshold", [60, 70, 75, 80, 85])
def test_budget_holds_for_any_threshold(threshold):
    """
    Colleges do not all use 75%. The invariant has two branches: if the target is
    still reachable, spending the whole budget must land on it; if it is already
    out of reach (85% here, where the ceiling is 83.33%), the budget must be zero
    rather than a misleading positive number.
    """
    attended, held, remaining = 45, 60, 30
    k = term_skip_budget(attended, held, remaining, threshold)
    ceiling = best_possible_percentage(attended, held, remaining)

    if ceiling >= threshold:
        assert percentage(attended + remaining - k, held + remaining) >= threshold
    else:
        assert k == 0
