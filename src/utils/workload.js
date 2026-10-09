const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Deterministic demo clock (Monday 21 Sep 2026). The MVP has no backend, so a
 * fixed "today" keeps the seeded demo week identical for every reviewer.
 * Every date calculation in the app reads from this single constant.
 */
export const DEMO_TODAY = new Date(2026, 8, 21);

/** One shared set of planning assumptions so the screens cannot disagree. */
export const DAILY_CAPACITY_HOURS = 6;
export const STUDY_WEEK_HOURS = DAILY_CAPACITY_HOURS * 4;
export const CLUSTER_WINDOW_DAYS = 3;
export const EXPECTED_PROGRESS_HORIZON_DAYS = 8;

/** The transparent rule-based weights from the Assignment 1 product hypothesis. */
export const RISK_WEIGHTS = { clustering: 40, effort: 35, deficit: 25 };
export const RISK_THRESHOLDS = { high: 70, medium: 45 };

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(value) {
  return parseLocalDate(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function daysUntil(dueDate, today = DEMO_TODAY) {
  return Math.ceil((parseLocalDate(dueDate) - today) / 86400000);
}

export function dueLabel(assignment) {
  const daysLeft = daysUntil(assignment.dueDate);
  const due = formatDate(assignment.dueDate);
  if (daysLeft < 0) return `Due ${due} - overdue`;
  if (daysLeft === 0) return `Due ${due} - today`;
  if (daysLeft === 1) return `Due ${due} - tomorrow`;
  return `Due ${due} - in ${daysLeft} days`;
}

export function progressOf(assignment) {
  if (!assignment.estimatedHours) return 0;
  return Math.min(100, Math.round((assignment.completedHours / assignment.estimatedHours) * 100));
}

/** Inverse of progressOf, used to keep the % and hours inputs in sync. */
export function hoursFromProgress(progress, estimatedHours) {
  const safe = Math.min(100, Math.max(0, Number(progress) || 0));
  return Number(((safe / 100) * Number(estimatedHours || 0)).toFixed(1));
}

export function remainingHours(assignment) {
  return Math.max(0, Number((assignment.estimatedHours - assignment.completedHours).toFixed(1)));
}

export function totalRemainingHours(assignments) {
  return Number(assignments.reduce((sum, a) => sum + remainingHours(a), 0).toFixed(1));
}

/** Remaining effort as a share of the four-day study-week budget. */
export function workloadPercent(assignments) {
  return Math.min(100, Math.round((totalRemainingHours(assignments) / STUDY_WEEK_HOURS) * 100));
}

export function weeklyWorkload(assignments) {
  // The demo week is Mon 21 - Sun 27 Sep 2026, driven by DEMO_TODAY.
  const values = DAY_NAMES.map((day, index) => ({
    day,
    hours: 0,
    capacity: DAILY_CAPACITY_HOURS,
    date: new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), DEMO_TODAY.getDate() + index),
  }));

  assignments.forEach((assignment) => {
    const remaining = remainingHours(assignment);
    const diffDays = daysUntil(assignment.dueDate);
    const slots = Math.max(1, Math.min(diffDays + 1, 4)); // effort spreads across at most four days
    const startIndex = Math.max(0, Math.min(diffDays - 1, 3));
    const allocation = remaining / slots;
    for (let i = 0; i < slots; i += 1) {
      const idx = Math.min(values.length - 1, startIndex + i);
      values[idx].hours += allocation;
    }
  });

  return values.map((item) => ({ ...item, hours: Number(item.hours.toFixed(1)) }));
}

/** Deadline clustering as a graded 0-1 signal (a boolean flag hid partial clusters). */
export function clusteringSignal(assignments) {
  if (assignments.length < 2) return 0;
  const days = assignments.map((a) => daysUntil(a.dueDate));
  let strongest = 0;
  days.forEach((day, index) => {
    let tally = 0;
    days.forEach((other, j) => {
      if (j === index) return;
      const gap = Math.abs(other - day);
      if (gap <= CLUSTER_WINDOW_DAYS) tally += 1 - gap / (CLUSTER_WINDOW_DAYS + 1);
    });
    strongest = Math.max(strongest, Math.min(1, tally / 2));
  });
  return Number(strongest.toFixed(3));
}

/** Remaining effort against the four-day study-week budget, 0-1. */
export function effortSignal(assignments) {
  return Math.min(1, totalRemainingHours(assignments) / STUDY_WEEK_HOURS);
}

/** How far behind the expected pace the tracked work is, 0-1. */
export function deficitSignal(assignments) {
  if (!assignments.length) return 0;
  const total = assignments.reduce((acc, a) => {
    const progress = progressOf(a) / 100;
    const daysRemaining = Math.max(1, daysUntil(a.dueDate));
    const expected = Math.min(0.9, Math.max(0.25, 1 - daysRemaining / EXPECTED_PROGRESS_HORIZON_DAYS));
    return acc + Math.max(0, expected - progress);
  }, 0);
  return Math.min(1, Number((total / assignments.length).toFixed(3)));
}

export function riskLevelFor(score) {
  if (score >= RISK_THRESHOLDS.high) return 'HIGH';
  if (score >= RISK_THRESHOLDS.medium) return 'MEDIUM';
  return 'LOW';
}

export function calculateRisk(assignments) {
  if (!assignments.length) {
    return {
      score: 0,
      level: 'LOW',
      breakdown: [],
      factors: [],
      signals: { clustering: 0, effort: 0, deficit: 0 },
      remaining: 0,
      confidenceNote: 'Add assignments to generate a workload forecast.',
    };
  }

  const clustering = clusteringSignal(assignments);
  const effort = effortSignal(assignments);
  const deficit = deficitSignal(assignments);
  const remaining = totalRemainingHours(assignments);

  // Transparent rule-based score: fixed weights, visible signals, no hidden model.
  const score = Math.min(100, Math.round(
    (clustering * RISK_WEIGHTS.clustering)
    + (effort * RISK_WEIGHTS.effort)
    + (deficit * RISK_WEIGHTS.deficit),
  ));
  const level = riskLevelFor(score);

  const clustered = assignments.filter((a) => assignments.some(
    (b) => b.id !== a.id && Math.abs(daysUntil(b.dueDate) - daysUntil(a.dueDate)) <= CLUSTER_WINDOW_DAYS,
  ));
  const lagging = assignments
    .filter((a) => progressOf(a) < 70 && a.estimatedHours >= 5)
    .sort((a, b) => remainingHours(b) - remainingHours(a))[0];

  const factors = [];
  if (clustering > 0) {
    factors.push(`${clustered.length} of ${assignments.length} assignments fall inside a ${CLUSTER_WINDOW_DAYS}-day window, so their effort competes for the same study days`);
  }
  if (effort >= 0.5) {
    factors.push(`${remaining} hours of remaining work against a ${STUDY_WEEK_HOURS}h study-week budget (${DAILY_CAPACITY_HOURS}h/day)`);
  } else if (remaining > 0) {
    factors.push(`${remaining} hours of remaining work still fits inside the ${STUDY_WEEK_HOURS}h study-week budget`);
  }
  if (lagging) {
    factors.push(`${lagging.name} is only ${progressOf(lagging)}% complete with ${remainingHours(lagging)} hours remaining`);
  }
  if (!factors.length) factors.push('Workload is currently within a manageable range');

  // Every point of the score is traceable: weight x signal = points.
  const breakdown = [
    {
      key: 'clustering',
      label: 'Deadline clustering',
      weightPct: RISK_WEIGHTS.clustering,
      signal: clustering,
      points: Number((clustering * RISK_WEIGHTS.clustering).toFixed(1)),
      explanation: clustering > 0
        ? `${clustered.length} deadlines sit within ${CLUSTER_WINDOW_DAYS} days of each other.`
        : `No deadlines are competing inside the same ${CLUSTER_WINDOW_DAYS}-day window.`,
    },
    {
      key: 'effort',
      label: 'Remaining effort',
      weightPct: RISK_WEIGHTS.effort,
      signal: effort,
      points: Number((effort * RISK_WEIGHTS.effort).toFixed(1)),
      explanation: `${remaining}h remaining is ${Math.round(effort * 100)}% of the ${STUDY_WEEK_HOURS}h study-week budget.`,
    },
    {
      key: 'deficit',
      label: 'Progress deficit',
      weightPct: RISK_WEIGHTS.deficit,
      signal: deficit,
      points: Number((deficit * RISK_WEIGHTS.deficit).toFixed(1)),
      explanation: deficit > 0
        ? 'At least one assignment is behind the pace expected for the time it has left.'
        : 'Progress on tracked work is keeping up with the time remaining.',
    },
  ];

  return {
    score,
    level,
    breakdown,
    factors,
    signals: { clustering, effort, deficit },
    remaining,
    confidenceNote: 'Planning heuristic - not a diagnosis or scientifically validated prediction.',
  };
}

/**
 * Per-assignment version of the same transparent rules, used for row-level
 * status indicators on the Dashboard and Assignment Details screens.
 */
export function assignmentRisk(assignment, assignments = []) {
  const remaining = remainingHours(assignment);
  const daysLeft = Math.max(0, daysUntil(assignment.dueDate));
  const neighbours = assignments.filter(
    (a) => a.id !== assignment.id && Math.abs(daysUntil(a.dueDate) - daysLeft) <= CLUSTER_WINDOW_DAYS,
  ).length;
  const capacity = Math.max(DAILY_CAPACITY_HOURS, (daysLeft + 1) * DAILY_CAPACITY_HOURS);
  const effort = Math.min(1, remaining / capacity);
  const expected = Math.min(0.9, Math.max(0.25, 1 - Math.max(1, daysLeft) / EXPECTED_PROGRESS_HORIZON_DAYS));
  const deficit = Math.min(1, Math.max(0, expected - progressOf(assignment) / 100));
  const clustering = neighbours ? Math.min(1, (neighbours + 1) / 3) : 0;

  const score = Math.min(100, Math.round(
    (clustering * RISK_WEIGHTS.clustering)
    + (effort * RISK_WEIGHTS.effort)
    + (deficit * RISK_WEIGHTS.deficit),
  ));
  const timing = daysLeft === 0 ? 'due today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  return {
    score,
    level: riskLevelFor(score),
    remaining,
    daysLeft,
    note: remaining === 0
      ? 'No remaining effort.'
      : `${remaining}h left - ${timing}${neighbours ? ' - clustered with other deadlines' : ''}`,
  };
}

const PLAN_BLOCKS = [
  { label: '09:00-11:00', hours: 2 },
  { label: '14:00-15:30', hours: 1.5 },
  { label: '17:00-18:00', hours: 1 },
];

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

export function buildPlan(assignments) {
  return [...assignments]
    .map((a) => ({ ...a, remaining: remainingHours(a), daysLeft: Math.max(0, daysUntil(a.dueDate)) }))
    .filter((a) => a.remaining > 0)
    .sort((a, b) => {
      const priority = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
      return priority || b.remaining - a.remaining;
    })
    .slice(0, PLAN_BLOCKS.length)
    .map((a, index) => {
      const block = PLAN_BLOCKS[index];
      const duration = Number(Math.min(block.hours, a.remaining).toFixed(1));
      const timing = a.daysLeft === 0 ? 'due today' : `${a.daysLeft} day${a.daysLeft === 1 ? '' : 's'} left`;
      return {
        ...a,
        block: block.label,
        duration,
        reason: `${a.priority} priority - ${a.remaining}h remaining - ${timing}`,
      };
    });
}

export function planTotalHours(plan) {
  return Number(plan.reduce((sum, item) => sum + item.duration, 0).toFixed(1));
}

/**
 * Projects the forecast as if the accepted plan blocks are completed.
 * This replaces the old hardcoded "risk - 24" tile with a real calculation.
 */
export function projectRiskAfterPlan(assignments, plan) {
  const before = calculateRisk(assignments);
  const plannedByAssignment = new Map(plan.map((item) => [item.id, item.duration]));
  const simulated = assignments.map((a) => {
    const planned = plannedByAssignment.get(a.id) || 0;
    const completedHours = Number(Math.min(a.estimatedHours, a.completedHours + planned).toFixed(1));
    return {
      ...a,
      completedHours,
      status: completedHours >= a.estimatedHours ? 'Completed' : a.status,
    };
  });
  const after = calculateRisk(simulated);

  return {
    before,
    after,
    delta: after.score - before.score,
    plannedHours: planTotalHours(plan),
    simulated,
  };
}
