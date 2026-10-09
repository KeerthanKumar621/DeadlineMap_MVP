import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Custom reusable component #1 (DeadlineMap design system).
 * Reused on SignUp, Login, Dashboard, AddAssignment, AssignmentDetails,
 * UpdateProgress, Workload, RiskForecast, RecommendedPlan and Outcome.
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  type = 'button',
  disabled = false,
  fullWidth = false,
  busy = false,
  to,
  onClick,
  className = '',
}) {
  const classes = [
    'dm-button',
    `dm-button-${variant}`,
    `dm-button-${size}`,
    fullWidth ? 'dm-button-block' : '',
    disabled || busy ? 'is-disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {Icon ? <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.4} /> : null}
      <span>{children}</span>
    </>
  );

  if (to && !disabled && !busy) {
    return (
      <Link className={classes} to={to} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
