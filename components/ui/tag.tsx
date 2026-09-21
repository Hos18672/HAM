import * as React from 'react';
import { cn } from './cn';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'accent-2';
}

/** A static label. Use `FilterTag` when it is a control. */
export function Tag({ tone = 'default', className, ...props }: TagProps) {
  return <span className={cn('tag', tone === 'accent-2' && 'tag-accent-2', className)} {...props} />;
}

export interface FilterTagProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Filter chips are toggles: `aria-pressed` carries the state, not a class. */
  pressed: boolean;
}

export function FilterTag({ pressed, className, ...props }: FilterTagProps) {
  return <button type="button" aria-pressed={pressed} className={cn('tag', className)} {...props} />;
}
