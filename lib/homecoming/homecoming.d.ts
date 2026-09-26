/**
 * Types for the vendored Homecoming scene.
 *
 * The package ships as plain JavaScript and `allowJs` is off in this project,
 * so this declares the one entry point the hero imports. It is a description
 * of `src/mount.js`, not a second source of truth: nothing here changes what
 * the scene does.
 */
declare module '@/lib/homecoming/src/mount.js' {
  export interface HomecomingControl {
    scene: unknown;
    setTheme(theme: 'light' | 'dark'): void;
    setProgress(progress: number): void;
    complete(): void;
    dispose(): void;
  }

  export interface HomecomingOptions {
    /** Covers the hero section; the canvas is created inside it. */
    host: HTMLElement;
    /** Square box in the hero layout where the logo comes to rest. */
    anchor?: HTMLElement | null;
    /** Receives clicks — the hero section. */
    eventsEl?: HTMLElement | null;
    /** Scaled 0 → 1 as loading progresses. */
    meterEl?: HTMLElement | null;
    theme?: 'light' | 'dark';
    /** Straight to the hero, no loader. */
    skipLoader?: boolean;
    /** 'page' waits for fonts, images and load; a promise waits for it. */
    progress?: 'page' | Promise<unknown> | null;
    /** Shown in the anchor when the browser has no WebGL 2. */
    fallbackImage?: string;
    onReady?: () => void;
    onError?: (error: Error) => void;
    sceneOptions?: Record<string, unknown>;
  }

  export function mountHomecoming(options: HomecomingOptions): HomecomingControl;
  export function hasWebGL2(): boolean;
}

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
