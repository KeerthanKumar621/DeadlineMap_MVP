import React from 'react';
import { ArrowUpRight, Minus, TrendingDown } from 'lucide-react';

/**
 * Custom reusable component #3 (DeadlineMap design system).
 * Reused on Dashboard, AssignmentDetails, Workload, RiskForecast and Outcome.
 * - `status` drives the card border (neutral | warning | good)
 * - `change` shows the delta pill (e.g. "-9")
 * - `badge` + `tone` show a status indicator when there is no delta
 */
export default function StatusCard({
  title,
  value,
  status = 'neutral',
  description,
  change,
  badge,
  tone,
  icon: Icon,
  compact = false,
}) {
  const ChangeIcon = change?.startsWith('+') ? ArrowUpRight : change?.startsWith('-') ? TrendingDown : Minus;
  const changeTone = change?.startsWith('-') ? 'down' : 'up';
  const resolvedTone = (tone || 'neutral').toLowerCase();

  return (
    <article className={`status-card status-${status}${compact ? ' status-card-compact' : ''}`}>
      <div className="status-card-top">
        <span className="status-title">
          {Icon ? <Icon size={13} strokeWidth={2.6} /> : null}
          {title}
        </span>
        {change ? (
          <span className={`change change-${changeTone}`}>
            <ChangeIcon size={13} /> {change}
          </span>
        ) : null}
        {!change && badge ? (
          <span className={`status-badge status-badge-${resolvedTone}`}>{badge}</span>
        ) : null}
      </div>
      <div className="status-value">{value}</div>
      {description ? <p className="status-description">{description}</p> : null}
    </article>
  );
}
