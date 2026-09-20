import React, { useCallback, useEffect, useState } from "react";
import "./BunkPlanner.css";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

/* Token, not a user id. The old `pat-current-user` id in localStorage is what
   let anyone read anyone else's attendance by editing a URL. */
const authHeaders = () => {
  const token = localStorage.getItem("pat-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * A single ledger row: subject, percentage, a bar with the pass mark marked on
 * it, and the number of classes still spare. Expands to a skip simulator.
 */
function SubjectRow({ subject, expanded, onToggle }) {
  const [sim, setSim] = useState(null);
  const [simBusy, setSimBusy] = useState(false);

  const runSim = async (skipCount) => {
    setSimBusy(true);
    try {
      const res = await fetch(`${API}/api/planner/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ subject_id: subject.subject_id, skip_count: skipCount }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSim({ ...data.result, skipCount });
    } catch {
      setSim({ error: "Could not work that out. Check your connection and try again." });
    } finally {
      setSimBusy(false);
    }
  };

  const fill = Math.min(100, subject.current_percent);

  return (
    <li className={`row row--${subject.status}`}>
      <button
        type="button"
        className="row__head"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="row__code">{subject.code}</span>

        <span className="row__bar" aria-hidden="true">
          <span className="row__fill" style={{ width: `${fill}%` }} />
          <span
            className="row__passmark"
            style={{ left: `${subject.threshold_percent}%` }}
          />
        </span>

        <span className="row__pct">{subject.current_percent}%</span>
        <span className="row__spare">
          {subject.term_skip_budget}
          <span className="row__spare-unit"> spare</span>
        </span>
      </button>

      {expanded && (
        <div className="row__detail">
          <p className="row__message">{subject.message}</p>
          <p className="row__counts">
            {subject.attended} of {subject.held} attended
            {subject.remaining > 0 && `, ${subject.remaining} still scheduled`}
          </p>

          <div className="sim">
            <span className="sim__label">If I miss</span>
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="sim__btn"
                disabled={simBusy}
                onClick={() => runSim(n)}
              >
                {n}
              </button>
            ))}
          </div>

          {sim && !sim.error && (
            <p className={`sim__out ${sim.drops_below ? "sim__out--bad" : "sim__out--ok"}`}>
              Missing {sim.skipCount} takes {subject.code} to {sim.percent_after}%
              {sim.drops_below
                ? ` — below the ${subject.threshold_percent}% line.`
                : `, leaving ${sim.budget_after} spare.`}
            </p>
          )}
          {sim && sim.error && <p className="sim__out sim__out--bad">{sim.error}</p>}
        </div>
      )}
    </li>
  );
}

export default function BunkPlanner() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API}/api/planner/overview`, { headers: authHeaders() });
      if (res.status === 401) {
        setError("Your session expired. Sign in again to see your planner.");
        return;
      }
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setError("The planner could not load. Check that the backend is running on port 5000.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <section className="planner">
        <p className="planner__error">{error}</p>
        <button type="button" className="planner__retry" onClick={load}>
          Try again
        </button>
      </section>
    );
  }

  if (!data) return <section className="planner planner--loading">Working out your balance…</section>;

  if (data.subjects.length === 0) {
    return (
      <section className="planner">
        <p className="planner__empty">
          Save your timetable and mark a few classes — the planner starts counting from there.
        </p>
      </section>
    );
  }

  const { overall, tightest, threshold_percent: threshold } = data;

  return (
    <section className="planner">
      <header className="balance">
        <p className="balance__number">{overall.term_skip_budget}</p>
        <p className="balance__label">
          classes you can still miss and stay above {threshold}%
        </p>
        <p className="balance__sub">
          {overall.current_percent}% overall · {overall.attended} of {overall.held} attended ·{" "}
          {overall.remaining} left this term
        </p>
      </header>

      {tightest && tightest.term_skip_budget <= 2 && (
        <p className="warning">{tightest.message}</p>
      )}

      <ol className="rows">
        {data.subjects.map((s) => (
          <SubjectRow
            key={s.subject_id}
            subject={s}
            expanded={openId === s.subject_id}
            onToggle={() => setOpenId(openId === s.subject_id ? null : s.subject_id)}
          />
        ))}
      </ol>

      <p className="footnote">
        The per-subject number assumes you attend every other class for the rest of term.
      </p>
    </section>
  );
}
