import * as React from 'react';
import { Link } from '@/lib/i18n/navigation';
import { cn } from './cn';

export type PillVariant = 'primary' | 'outline' | 'soft';
export type PillSize = 44 | 50 | 52;

const classes = (variant: PillVariant, size: PillSize, className?: string) =>
  cn('pill', `pill-${variant}`, `pill-${size}`, className);

/**
 * The navigation's button: a pill. Primary is the green fill, outline a
 * hairline ring, soft the chip ground. It lifts a little on hover.
 */
export function PillButton({
  variant = 'primary',
  size = 44,
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: PillVariant; size?: PillSize }) {
  return <button type={type} className={classes(variant, size, className)} {...props} />;
}

/** The same pill as a link inside the site (locale-aware) or out of it. */
export function PillLink({
  variant = 'primary',
  size = 44,
  className,
  href,
  ...props
}: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  variant?: PillVariant;
  size?: PillSize;
}) {
  const cls = classes(variant, size, className);
  if (/^(https?:|mailto:|tel:)/.test(href)) return <a href={href} className={cls} {...props} />;
  return <Link href={href} className={cls} {...props} />;
}
