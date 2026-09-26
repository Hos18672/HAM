/**
 * Types for the vendored Vienna skyline.
 *
 * The package ships as plain JavaScript and `allowJs` is off in this project,
 * so this declares the one entry point the footer imports.
 */
declare module '@/lib/vienna-skyline/vienna-skyline.js' {
  export interface ViennaSkylineOptions {
    /** Any CSS colour, including `var(--token)`, or 'auto'. */
    color?: string;
    fallbackColor?: string;
    /** Re-read the colour about once a second (theme switches). */
    watchColor?: boolean;
    skyPadding?: number;
    minHeight?: number;
    maxHeight?: number;
    birds?: number;
    clouds?: number;
    wheelSpeed?: number;
    reveal?: boolean;
    interactive?: boolean;
    maxPixelRatio?: number;
  }

  export interface ViennaSkylineControl {
    replay(): void;
    setColor(value: string): void;
    destroy(): void;
  }

  export function createViennaSkyline(
    container: HTMLElement,
    options?: ViennaSkylineOptions,
  ): ViennaSkylineControl;
}

declare module '@/lib/vienna-skyline/vienna-skyline-art.js' {
  /** The city, as an SVG string (viewBox 6516 × 1248, drawn at 2172 × 416). */
  export const BASE_SVG: string;
  /** The river under it. */
  export const WATER_SVG: string;
}
