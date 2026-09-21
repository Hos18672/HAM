/** Join class names, dropping falsy entries. Small on purpose — the design
 *  system's classes never conflict, so a merge strategy is not needed. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
