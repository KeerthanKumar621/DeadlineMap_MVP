import React from 'react';

/**
 * Custom reusable component #2 (DeadlineMap design system).
 * Renders a text/number/date input, a styled select (via `options`) or a
 * textarea (via `multiline`) so every screen shares one field style.
 * Reused on SignUp, Login, AddAssignment and UpdateProgress.
 */
export default function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  error,
  min,
  max,
  step,
  options,
  multiline = false,
  wide = false,
  hint,
  name,
  id,
  onBlur,
  disabled = false,
}) {
  const fieldId = id || (label ? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  const classes = `field-input${error ? ' has-error' : ''}${multiline ? ' textarea' : ''}`;

  const shared = {
    id: fieldId,
    name: name || fieldId,
    className: classes,
    value,
    disabled,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    onBlur: onBlur ? (e) => onBlur(e.target.value) : undefined,
  };

  return (
    <label className={`field${wide ? ' field-wide' : ''}`} htmlFor={fieldId}>
      <span className="field-label">{label}{required ? ' *' : ''}</span>
      {options ? (
        <select {...shared} onChange={(e) => onChange(e.target.value)}>
          {options.map((option) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
      ) : multiline ? (
        <textarea {...shared} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...shared} type={type} placeholder={placeholder} min={min} max={max} step={step} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && !error ? <span className="field-hint" id={hintId}>{hint}</span> : null}
      {error ? <span className="field-error" id={errorId}>{error}</span> : null}
    </label>
  );
}
