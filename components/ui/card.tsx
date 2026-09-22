import * as React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** The rounder, tinted surface used on the prayer, du'a and gallery pages —
   *  a documented variant of the set, not a second design. */
  variant?: 'default' | 'soft' | 'softer';
  interactive?: boolean;
  /** The highlighted member of a set: next prayer, today, an occasion. */
  marked?: boolean;
  /**
   * The design's corner plate: a square of the girih tiling in the top corner,
   * which deepens and rights itself as the card is hovered. Purely
   * decorative, and rotated per position by the stylesheet so no two
   * neighbouring cards carry the same plate.
   */
  plate?: boolean;
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
  plate,
  as: Tag = 'div',
  className,
  children,
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
    >
      {plate ? (
        <svg className="card-plate" width="96" height="96" aria-hidden="true" focusable="false">
          <rect className="pA" width="96" height="96" fill="url(#ham-khatam)" />
          <rect className="pB" width="96" height="96" fill="url(#ham-shesh)" />
        </svg>
      ) : null}
      {children}
    </Element>
  );
}

/**
 * The rounded frame the design sets behind a card's icon — a 54px square with
 * an 18.4px radius, tinted and ringed in gold, which grows a little with the
 * card.
 */
export function CardStar({ children }: { children: React.ReactNode }) {
  return (
    <span className="card-star-wrap">
      <svg className="card-star" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
        <rect
          x="1"
          y="1"
          width="54"
          height="54"
          rx="18.4"
          fill="var(--starFill)"
          stroke="var(--gold)"
          strokeWidth="1"
        />
      </svg>
      <span className="card-star-icon">{children}</span>
    </span>
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
