import type { ReactNode } from 'react';
import './globals.css';

/**
 * The root layout is deliberately thin: `<html>` needs `lang` and `dir`, which
 * are only known once the locale segment has resolved, so those are set in
 * `app/[locale]/layout.tsx`. This file exists to satisfy the App Router and to
 * carry the stylesheet.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
