'use client';

import * as React from 'react';
import { cn } from './cn';

let autoId = 0;
function useFieldId(provided?: string) {
  const generated = React.useId();
  return provided ?? `field-${generated}-${(autoId += 0)}`;
}

export interface FieldProps {
  label: string;
  /** Passed to the control. Errors are wired with `aria-describedby`, never
   *  signalled by colour alone. */
  error?: string;
  hint?: string;
  required?: boolean;
  optionalLabel?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
    required: boolean | undefined;
  }) => React.ReactNode;
  id?: string;
  className?: string;
}

/**
 * `.field` from the design system: label, control, hint and error, with the
 * ARIA plumbing done once so no form has to remember it.
 */
export function Field({
  label,
  error,
  hint,
  required,
  optionalLabel,
  children,
  id,
  className,
}: FieldProps) {
  const fieldId = useFieldId(id);
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('field', className)}>
      <label className="field-label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="field-required" aria-hidden="true">
            *
          </span>
        ) : optionalLabel ? (
          <span className="field-hint"> ({optionalLabel})</span>
        ) : null}
      </label>
      {children({
        id: fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
        required: required || undefined,
      })}
      {hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input', className)} {...props} />;
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('input', className)} {...props} />;
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn('input', className)} {...props} />;
});
