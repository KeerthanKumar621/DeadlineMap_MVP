import React from 'react';

/**
 * Third-party integration — 21st.dev.
 * Adapted from the ReUI "Progress / Circle" component surfaced on 21st.dev:
 * https://21st.dev/@sean0205/components/progress/circle
 *
 * The upstream component (dependency: radix-ui, styled with Tailwind) exposes
 * `value`, `size`, `strokeWidth`, `className`, `indicatorClassName` and
 * `children`. This project has no Tailwind toolchain, so the same API shape is
 * kept and the visuals are mapped onto the DeadlineMap CSS tokens instead:
 *   value / max          -> share of the ring that is filled
 *   size / strokeWidth   -> geometry (identical mental model)
 *   children             -> custom centre content (upstream pattern)
 *   label                -> fallback centre caption used by DeadlineMap
 *   className            -> wrapper class hook
 *   tone                 -> replaces indicatorClassName colour utilities
 * Reused on UpdateProgress, RiskForecast and Weekly Workload.
 */
export default function ProgressCircle({
  value = 0,
  max = 100,
  size = 124,
  strokeWidth = 9,
  children,
  label,
  className = '',
  tone = 'navy',
}) {
  const safeMax = Number(max) > 0 ? Number(max) : 100;
  const safe = Math.min(100, Math.max(0, (Number(value) / safeMax) * 100));
  const rounded = Math.round(safe);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (safe / 100) * circumference;

  return (
    <div
      className={`progress-circle-wrap tone-${tone} ${className}`.trim()}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${rounded}% ${label || 'progress'}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(23,36,79,.08)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="progress-circle-value"
        />
      </svg>
      <div className="progress-circle-center">
        {children || (
          <>
            <strong>{rounded}</strong>
            {label ? <span>{label}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}
