import * as React from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'on-scrim';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<ButtonVariant, string> = {
  primary: '',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  /** For a control sitting on a scrim — the lightbox chrome. */
  'on-scrim': 'btn-on-scrim',
};

const sizeClass: Record<ButtonSize, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square padding for a button whose only child is an icon. */
  iconOnly?: boolean;
  loading?: boolean;
}

/** The `.btn` contract from the design system, typed. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', iconOnly, loading, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      aria-busy={loading || undefined}
      className={cn(
        'btn',
        variantClass[variant],
        sizeClass[size],
        iconOnly && 'btn-icon',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

/**
 * The path a root-relative href has to carry under the preview's sub-path.
 *
 * `basePath` in `next.config.ts` rewrites what the framework emits — the
 * router, the chunks, `next/link` — but not an `<a href>` the app writes
 * itself, and this is one. Without it every button here pointed at the root
 * of github.io rather than at /HAM, which is a 404 on each of them.
 * Inlined at build time and empty on every real build.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Same surface, rendered as an anchor. Used for navigation CTAs, which must
 *  stay real links so they can be opened in a new tab. */
export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  { variant = 'primary', size = 'md', iconOnly, className, href, ...props },
  ref,
) {
  return (
    <a
      ref={ref}
      href={href?.startsWith('/') ? `${BASE}${href}` : href}
      className={cn(
        'btn',
        variantClass[variant],
        sizeClass[size],
        iconOnly && 'btn-icon',
        className,
      )}
      {...props}
    />
  );
});
