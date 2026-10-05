/**
 * Types for the vendored Homecoming scene.
 *
 * The package ships as plain JavaScript and `allowJs` is off in this project,
 * so this declares the entry point the site's birds import. The home hero's
 * loader that once used this scene has been replaced by a CSS intro.
 */
declare module '@/lib/homecoming/page-sky.js' {
  export interface PageSkyControl {
    setTheme(theme: 'light' | 'dark'): void;
    dispose(): void;
  }

  export interface PageSkyOptions {
    theme?: 'light' | 'dark';
    /** Element carrying the theme attribute; the colours follow it. */
    themeEl?: HTMLElement;
    themeAttr?: string;
    /** Read every frame: 0 hides the birds (they keep flying), 1 shows them. */
    visibility?: () => number;
    /**
     * Read every frame: no-fly boxes in client pixels,
     * [left, top, right, bottom, upOnly]. upOnly = 1 lets a bird leave the box
     * only upwards (a silhouette standing on the ground).
     */
    obstacles?: () => Array<[number, number, number, number, number]>;
  }

  /** The Homecoming birds, wandering over the page in loose flocks. */
  export function createPageSky(host: HTMLElement, options?: PageSkyOptions): PageSkyControl;
}
