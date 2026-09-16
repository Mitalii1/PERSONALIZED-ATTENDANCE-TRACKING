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


def test_zero_held_is_zero_not_a_crash():
    assert percentage(0, 0) == 0.0


def test_exact_threshold_is_not_a_rounding_victim():
    assert percentage(30, 40) == 75.0


def test_comfortable_student_can_skip_thirteen():
    assert skips_available(40, 40) == 13


def test_exactly_on_the_line_has_nothing_to_spare():
    assert skips_available(30, 40) == 0


def test_below_the_line_returns_zero_never_negative():
    assert skips_available(20, 40) == 0


def test_already_above_needs_nothing_to_recover():
    assert classes_to_recover(38, 40) == 0


def test_below_the_line_recovery_count_reaches_threshold():
    attended, held = 20, 40
    needed = classes_to_recover(attended, held)
    assert percentage(attended + needed, held + needed) >= 75.0
    assert percentage(attended + needed - 1, held + needed - 1) < 75.0


def test_term_budget_never_exceeds_remaining_classes():
    assert term_skip_budget(50, 50, 5) == 5


def test_term_budget_can_be_spent_without_dropping_below_threshold():
    attended, held, remaining = 34, 40, 20
    budget = term_skip_budget(attended, held, remaining)
    assert percentage(attended + remaining - budget, held + remaining) >= 75.0
    assert percentage(attended + remaining - budget - 1, held + remaining) < 75.0


def test_no_remaining_classes_means_no_budget():
    assert term_skip_budget(20, 40, 0) == 0


def make_plan(attended, held, remaining):
    return build_subject_plan(
        subject_id=1,
        code="DCCN",
        name="Data Comms",
        attended=attended,
        held=held,
        remaining=remaining,
    )


def test_healthy_subject_reads_safe():
    assert make_plan(38, 40, 20).status == "safe"


def test_doomed_subject_is_unrecoverable():
    plan = make_plan(2, 30, 5)
    assert plan.status == "unrecoverable"
    assert plan.reachable is False
    assert best_possible_percentage(2, 30, 5) == 20.0


def test_fresh_term_does_not_divide_by_zero():
    plan = make_plan(0, 0, 40)
    assert plan.current_percent == 0.0
    assert plan.status in {"safe", "tight", "at_risk"}


def test_simulating_a_skip_on_the_line_drops_below():
    plan = build_subject_plan(
        subject_id=1,
        code="AMCS",
        name="Applied Maths",
        attended=30,
        held=40,
        remaining=10,
    )
    assert simulate_skip(plan, 1)["drops_below"] is True


def test_simulating_a_skip_with_slack_is_safe():
    plan = build_subject_plan(
        subject_id=1,
        code="AMCS",
        name="Applied Maths",
        attended=40,
        held=40,
        remaining=10,
    )
    assert simulate_skip(plan, 1)["drops_below"] is False


@pytest.mark.parametrize("threshold", [60, 70, 75, 80, 85])
def test_budget_holds_for_any_threshold(threshold):
    attended, held, remaining = 45, 60, 30
    budget = term_skip_budget(attended, held, remaining, threshold)
    ceiling = best_possible_percentage(attended, held, remaining)

    if ceiling >= threshold:
        assert percentage(attended + remaining - budget, held + remaining) >= threshold
    else:
        assert budget == 0
