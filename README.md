# DeadlineMap MVP

DeadlineMap is a student workload early-warning system built from the supplied
Assignment 1 business case and Figma flow. The MVP demonstrates one core
behaviour: **assignment data -> workload interpretation -> transparent risk
forecast -> recommended action.**

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## MVP flow

Sign Up -> Login -> Dashboard -> Add Assignment -> Assignment Details -> Update Progress -> Weekly Workload -> Risk Forecast -> Recommended Plan -> Action Success or Action Needed

## Assignment 2 requirement traceability

| Requirement | Where it lives | Reused on |
| --- | --- | --- |
| Login screen | `Login` in `src/App.jsx` (`/login`), protected routes via `Protected` | -- |
| 2-3 information-entry screens | `AddAssignment` (`/add-assignment`), `UpdateProgress` (`/assignment/:id/progress`), `SignUp` (`/signup`) | all use `InputField` + `Button` |
| Final success/failure confirmation | `Outcome` (`/success`): success when the accepted plan drops the forecast below HIGH, failure ("Action needed") when it does not | `StatusCard`, `Button` |
| Custom component 1: `Button` | `src/components/Button.jsx` - variants, sizes, icons, `to` link mode, disabled/busy | SignUp, Login, Dashboard, AddAssignment, AssignmentDetails, UpdateProgress, Workload, RiskForecast, RecommendedPlan, Outcome |
| Custom component 2: `InputField` | `src/components/InputField.jsx` - text/number/date, `options` select, `multiline` textarea, hint/error, a11y wiring | SignUp, Login, AddAssignment, UpdateProgress |
| Custom component 3: `StatusCard` | `src/components/StatusCard.jsx` - value, border status, delta `change`, `badge`/`tone` status indicator, compact variant | Dashboard, AssignmentDetails, UpdateProgress, Workload, RecommendedPlan, Outcome |
| 21st.dev component | `src/third-party/ProgressCircle.jsx` (ReUI Progress / Circle) | UpdateProgress, RiskForecast, Workload - see `THIRD_PARTY.md` |

## Core implementation notes

- No backend or permanent database. All state is React state inside
  `AppProvider` (`src/App.jsx`); `resetDemo()` restores the seeded data.
- Deterministic demo clock: `DEMO_TODAY = 21 Sep 2026` in
  `src/utils/workload.js`, so the demo week behaves identically for every reviewer.
- Shared planning assumptions: `DAILY_CAPACITY_HOURS = 6`,
  `STUDY_WEEK_HOURS = 24`, `CLUSTER_WINDOW_DAYS = 3`.
- Assignment model: name, subject, dueDate, estimatedHours, completedHours,
  priority, status, note. Progress is derived from hours (`progressOf`), and
  `UpdateProgress` keeps the percentage and hours fields in sync.

### Risk forecast (transparent, rule-based)

`score = clustering x 40 + effort x 35 + deficit x 25`

| Factor | Weight | Signal |
| --- | --- | --- |
| Deadline clustering | 40 | share of assignments whose due dates fall inside a 3-day window, weighted by how tightly they cluster |
| Remaining effort | 35 | remaining hours against the 24h study-week budget |
| Progress deficit | 25 | expected progress (8-day horizon, 25%-90%) minus actual progress, averaged |

Levels: `>= 70 HIGH`, `>= 45 MEDIUM`, otherwise `LOW`. The Risk Forecast screen
prints every weight, signal and point value next to plain-language reasons, and
`assignmentRisk()` reuses the same rules for per-assignment status indicators.
The score is a **planning heuristic, not a diagnosis or a prediction of academic
success** - this disclaimer appears in the sidebar, the forecast, the plan and
the outcome screens.

### Worked example with the seeded data

- Remaining effort 18.3h = 76% of the 24h study-week budget.
- Three of four assignments are due 24 Sep 2026 -> maximum clustering signal.
- Overall score **72/100 (HIGH)** = 40.0 (clustering) + 26.7 (effort) + 4.9 (deficit).
- Accepting the recommended plan (2h + 1.5h + 1h) projects **62/100 (MEDIUM)**,
  a real -10 point change; the plan screen calculates this rather than hardcoding it.
- Failure outcome check: add a 30h assignment due 25 Sep and the same plan leaves
  the forecast at 80/100 (HIGH), so the outcome screen switches to "Action
  needed" and asks for more capacity or reduced scope.

## Demo path

1. Sign up (or use Login - any non-empty credentials open the prototype).
2. Dashboard -> Add Assignment (name, subject, due date, estimated hours, priority, status).
3. Save it and watch the forecast, status pill and item-level risk update.
4. Open an assignment -> Update Progress (percentage and hours stay in sync) -> Save.
5. Open Weekly Workload: bars per day, capacity ring and summary cards.
6. Open Risk Forecast: score ring, weight x signal = points breakdown, reasons.
7. Open Recommended Plan: prioritised blocks with reasons and the projected score.
8. Accept the plan -> Outcome screen (success, or failure when risk stays HIGH).

## Assessment evidence helpers

For the video and report, show:
- Cline Plan Mode output (the audit and plan) and the Act Mode implementation.
- `src/components/Button.jsx`, `InputField.jsx`, `StatusCard.jsx` and the screens reusing them.
- `StatusCard` props passed from `Dashboard`/`AssignmentDetails` to the child component.
- `src/third-party/ProgressCircle.jsx` and the 21st.dev source note in `THIRD_PARTY.md`.
- The same assignment re-scored after a progress update (the forecast moves).

## Core implementation notes

- No backend or permanent database is required for the MVP. React state is used for the prototype workflow.
- Risk score uses the Assignment 1 product hypothesis: deadline clustering (40%), remaining effort (35%), progress deficit (25%).
- The risk text explicitly states the score is a planning heuristic, not a diagnosis or scientifically validated prediction.
- Custom reusable components: `Button`, `InputField`, `StatusCard`.
- Each custom component is reused across multiple screens.
- A local `ProgressCircle` component is included as the required third-party integration, adapted from the ReUI Progress/Circle component surfaced on 21st.dev: https://21st.dev/@sean0205/components/progress/circle

## Demo path

1. Sign up (or use Login with any non-empty credentials).
2. Dashboard -> Add Assignment.
3. Save an assignment.
4. Open an assignment -> Update Progress -> Save.
5. Open Weekly Workload.
6. Open Risk Forecast.
7. Open Recommended Plan.
8. Accept the plan -> Success screen.

## Assessment evidence helpers

For the video, show:
- Cline Plan Mode and Act Mode in your own development session.
- `src/components/Button.jsx`, `InputField.jsx`, `StatusCard.jsx`.
- Reuse of the components on multiple pages in the browser.
- `StatusCard` props passed from `Dashboard`/`AssignmentDetails` to the child component.
- `src/third-party/ProgressCircle.jsx` and the 21st.dev source note.
