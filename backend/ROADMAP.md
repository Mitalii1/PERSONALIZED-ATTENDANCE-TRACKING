# Attendance Tracker — upgrade roadmap

The app already does the hard part: it reads a timetable, stores a schedule, and
records attendance. What separates it from a submitted assignment is three
things — it should be safe to run, it should answer a question nobody else's app
answers, and a stranger should be able to run it in one command.

Ordered by what buys you the most for the least work.

---

## Tier 1 — the things that currently undercut it

### 1.1 Rotate the credentials, then check git history

The handoff notes that `.env` holds a real Groq key and a MySQL password. Rotate
both today. Then check whether it was ever committed:

```powershell
git log --all --full-history -- backend/.env
```

If that prints anything, the key is in the history and rotating is not optional —
deleting the file in a later commit does not remove it. Add `.env` to
`.gitignore`, commit a `.env.example` with empty values instead, and let the
`secrets` job in `.github/workflows/ci.yml` catch it next time.

### 1.2 Stop trusting the client for identity

This is the biggest real flaw. Right now the frontend keeps `pat-current-user` in
localStorage and routes look like `/api/attendance/today/<user_id>`. Change the
number in that URL and you are reading a stranger's attendance. It takes about
thirty seconds to find, and anyone technical reviewing the project will find it.

`backend/auth.py` fixes it. Routes stop accepting a user id entirely:

```python
# app.py
from auth import require_auth, issue_token, hash_password, verify_password

@app.post("/login")
def login():
    # ... look up the user, verify_password(...) ...
    return jsonify({"token": issue_token(user["id"], user["email"]),
                    "name": user["name"]})

@app.get("/api/attendance/summary")     # note: no <user_id> any more
@require_auth
def summary():
    return jsonify(load_summary(g.user_id))
```

Frontend side: store `pat-token` instead of `pat-current-user`, and send
`Authorization: Bearer <token>` on every request. `BunkPlanner.js` shows the
pattern.

Set a real secret first:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

…into `JWT_SECRET` in `backend/.env`. `auth.py` refuses to import without it, on
purpose.

### 1.3 Make the database reproducible

`backend/attendance_db.sql` is currently a truncate script, and three of the four
tables have to exist before the app works. `backend/schema.sql` replaces both:
one idempotent file that creates the database, all tables, foreign keys, indexes
and a `schema_migrations` row.

Two design decisions in there worth keeping:

- **Cancelled classes are stored but not counted.** `attendance.status` includes
  `cancelled` and `holiday`. A class the lecturer skipped should never damage a
  student's percentage, and the `v_subject_totals` view encodes that rule once so
  no route can get it wrong.
- **The threshold lives on the user.** Not every college uses 75%. Hard-coding it
  means the app only works for your college.

### 1.4 Tests

`backend/tests/test_planner.py` has 23 passing tests and needs no database. One
of them caught a real edge case while I was writing it: when the target
percentage is already mathematically out of reach, the skip budget must be zero
rather than a positive number that quietly lies to the student.

---

## Tier 2 — the feature that makes it yours

There are a hundred attendance trackers on GitHub. Almost all of them stop at
"here is your percentage". The question students actually ask is different:

> **Can I skip tomorrow's 8:15 class or not?**

`backend/planner.py` answers it. The maths:

| Question | Formula |
|---|---|
| Classes I can miss starting now | `floor(attended / p − held)` |
| Classes I must attend to recover | `ceil((p·held − attended) / (1 − p))` |
| Classes I can miss over the rest of term | `floor(attended + remaining − p·(held + remaining))` |
| Best I can finish on | `(attended + remaining) / (held + remaining)` |

The third one is the honest number, because it accounts for the classes still on
your timetable between today and the end of term. The first one flatters you.

Two implementation notes:

- Everything uses `fractions.Fraction`, not floats. A student sitting at exactly
  30/40 is at 75.0%, and float arithmetic will occasionally tell them 74.99% and
  cause a small heart attack.
- `planner.py` imports neither Flask nor the database. That is why it is
  testable, and why the tests run in 0.04 seconds.

`routes_planner.py` wires it up — register the blueprint and you get
`/api/planner/overview`, `/api/planner/simulate` and `/api/planner/settings`.
`BunkPlanner.js` is the screen: one big number at the top (how many classes you
have left to spend), then a row per subject with the pass mark drawn as an actual
vertical line on each bar, and a "if I miss 1 / 2 / 3 / 5" simulator.

**Next additions in the same direction**, roughly in order of payoff:

1. **Per-slot prompt.** On the dashboard, next to each of today's classes, show
   "safe to skip" or "you can't afford this one". The data is already in the
   overview response.
2. **Recovery plan.** For a subject below the line, list the specific dates from
   the timetable you must attend to get back above it.
3. **Streaks and a weekly digest.** You already asked for weekly summaries in
   your own study workflow — the same idea applies here: a Sunday-night summary
   of what moved.
4. **A PWA manifest.** Marking attendance happens on a phone, in a classroom,
   sometimes without signal. Add a manifest, a service worker, and queue marks
   made offline. This is a genuinely impressive addition and it is maybe 80 lines.

---

## Tier 3 — the extraction problem, properly

The 502 happened because the model name was hard-coded and the key had no vision
model. Mock mode papers over it. `backend/timetable_ai.py` rewrites the approach:

- **Discover the model at runtime.** Ask the provider what it serves, pick the
  first candidate from a configurable list that is actually available, cache it.
  Pin one with `GROQ_MODEL` if you want to.
- **Ask for a confidence per cell.** A phone photo of a timetable taken at an
  angle *will* be misread. The prompt asks for an honest 0–1 confidence per cell
  and specifically tells the model not to round everything to 0.9. Cells under
  0.6 come back in `needs_review`, and the UI should highlight exactly those for
  the student to fix. Four cells to check beats a silently wrong timetable.
- **Validate against a closed vocabulary** before anything reaches MySQL. Days
  must be 1–6, slots must be one of your five, subject codes must have been
  declared. A model that invents slot `s6` fails here, loudly, in a log line.
- **Degrade on purpose.** Failures return a sample timetable with
  `source: "mock"` and a `notes` string explaining what happened, so the UI can
  say "automatic reading is unavailable, edit the grid below" instead of showing
  a 502.

The prompt itself is in `SYSTEM_PROMPT`. Three things make it work: temperature 0
(this is extraction, not writing), `response_format={"type": "json_object"}`, and
spelling out the exact slot vocabulary with the printed times so the model maps
rather than guesses.

**Also build a manual grid editor.** AI extraction should be the fast path, not
the only path. A 6×5 editable grid where you pick a subject per cell is an
afternoon's work, it makes the app usable by someone whose photo is blurry, and
it doubles as the fix-up screen for low-confidence cells.

---

## Tier 4 — presentation

`docker-compose.yml`, `backend/Dockerfile` and `backend/requirements.txt` mean
the whole stack comes up with:

```powershell
docker compose up --build
```

Pinned dependencies matter more than they look: `pip install flask flask-cors
pymysql groq` installs something different every month, which is how a project
that worked in September stops working in November.

Two more, cheap:

- **Rename `forntend`.** It is a one-line `git mv` plus a search for the string
  in scripts. Leaving it in is a small thing a reviewer will notice.
- **Rewrite the README around screenshots.** Nobody clones a project to evaluate
  it. Three screenshots — the timetable upload, the dashboard, the planner — plus
  one paragraph on the skip-budget maths does more than any amount of prose.

---

## Suggested order

| Week | Work |
|---|---|
| 1 | Rotate credentials, `schema.sql`, JWT auth end to end |
| 2 | Planner backend + tests + the planner screen |
| 3 | Manual timetable grid editor, low-confidence review flow |
| 4 | Docker, CI, README with screenshots |
| 5+ | PWA and offline marking, weekly digest |
