import * as React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** The rounder, tinted surface used on the prayer, du'a and gallery pages —
   *  a documented variant of the set, not a second design. */
  variant?: 'default' | 'soft' | 'softer';
  interactive?: boolean;
  /** The highlighted member of a set: next prayer, today, an occasion. */
  marked?: boolean;
  as?: 'div' | 'article' | 'li' | 'section';
}

/**
 * `.card` is reserved for genuinely discrete listings — a course, an event, a
 * du'a. Page layout is done with whitespace, never with cards.
 */
export function Card({
  variant = 'default',
  interactive,
  marked,
  as: Tag = 'div',
  className,
  ...props
}: CardProps) {
  // `Tag` is one of a handful of block elements; widening the prop type to
  // HTMLElement is what lets the same props object serve all of them.
  const Element = Tag as React.ElementType;
  return (
    <Element
      className={cn(
        'card',
        variant === 'soft' && 'card-soft',
        variant === 'softer' && 'card-soft card-softer',
        interactive && 'card-interactive',
        marked && 'card-marked',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('card-title', className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('card-body', className)} {...props} />;
}

export function CardFoot({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card-foot', className)} {...props} />;
}

/** A labelled fact pair — "when to read / source", "bearing / distance". */
export function FactPair({
  label,
  value,
  className,
  ...props
}: { label: string; value: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <span className="kicker">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
