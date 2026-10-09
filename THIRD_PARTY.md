# 21st.dev integration record

## Component
ReUI Progress / Circle, surfaced through 21st.dev.

Source page:
https://21st.dev/@sean0205/components/progress/circle

Installed copy: `src/third-party/ProgressCircle.jsx`

## Why the component was adapted instead of npm-installed
The upstream component declares a `radix-ui` dependency and is styled with
Tailwind utility classes (`className`, `indicatorClassName`, e.g.
`text-fuchsia-500`, `text-muted-foreground`). DeadlineMap deliberately has no
Tailwind toolchain: it uses a single global stylesheet with design tokens
(`src/styles.css`) so the supplied Figma visual language stays consistent. The
component was therefore integrated into the project with its public API kept
1:1, and its class hooks mapped onto the DeadlineMap tokens.

## API mapping (upstream -> DeadlineMap)

| 21st.dev (ReUI Progress / Circle) | DeadlineMap adaptation | Notes |
| --- | --- | --- |
| `value` | `value` (default 0) | identical |
| `max` | `max` (default 100) | identical |
| `size` | `size` (default 124) | identical geometry |
| `strokeWidth` | `strokeWidth` (default 9) | identical |
| `children` (custom centre content) | `children` | identical pattern; `label` is used when no children are passed |
| `className` | `className` | wrapper class hook |
| `indicatorClassName` (Tailwind colour) | `tone` (`navy` / `high` / `medium` / `low` / `good`) | Tailwind colour utilities replaced by CSS token classes |
| `radix-ui` dependency | none | plain SVG + React only |

## Where it is used (three screens)
- **Update Progress** - live completion preview while the student types.
- **Risk Forecast** - the 0-100 risk score ring, toned by risk level.
- **Weekly Workload** - share of the four-day study-week budget already committed.

## Important submission evidence
The assessment requires the copy-prompt-and-implement workflow to be visible.
During the Cline development session:
1. Open the 21st.dev page linked above.
2. Use 21st.dev's "Copy prompt" button and paste the prompt into Cline (Act mode).
3. Capture the Cline response that produced `src/third-party/ProgressCircle.jsx`.
4. Screenshot the component rendering on all three screens listed above.

Screenshot placeholders for the report:
- `docs/evidence/21stdev-source-page.png`
- `docs/evidence/21stdev-progress-circle-in-app.png`
