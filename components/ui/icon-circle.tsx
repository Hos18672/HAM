import * as React from 'react';
import { cn } from './cn';

/**
 * A round icon control on the chip ground. It has no text of its own, so a
 * label is required by the type.
 */
export const IconCircle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }
>(function IconCircle({ className, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={cn('icon-circle', className)} {...props} />;
});
