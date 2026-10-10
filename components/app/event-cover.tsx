import {
  BookOpenText,
  Feather,
  Handshake,
  MoonStars,
  SoccerBall,
  Star,
} from '@phosphor-icons/react/dist/ssr';

type Icon = typeof Star;

/**
 * The covers events wear in the app when they have no photo of their own:
 * the brand lattice in one of three grounds, with a large icon in a halo.
 * Each category keeps the same ground and icon everywhere it appears.
 */
export type CoverTone = 'dark' | 'light' | 'sand';

const BY_CATEGORY: Record<string, { tone: CoverTone; icon: Icon }> = {
  opening: { tone: 'dark', icon: Star },
  culture: { tone: 'sand', icon: Feather },
  community: { tone: 'light', icon: Handshake },
  courses: { tone: 'light', icon: BookOpenText },
  sport: { tone: 'light', icon: SoccerBall },
};

export function coverFor(category: string) {
  return BY_CATEGORY[category] ?? { tone: 'dark' as const, icon: MoonStars };
}

/** The colour bar beside an event in a list, by category. */
export function categoryColour(category: string) {
  switch (category) {
    case 'opening':
      return 'var(--gold)';
    case 'culture':
      return 'var(--goldInk)';
    case 'courses':
      return 'var(--green)';
    case 'community':
    case 'sport':
      return 'var(--ink2)';
    default:
      return 'var(--green)';
  }
}

export function EventCover({
  category,
  imageUrl,
  imageAlt,
  size = 56,
  className,
  children,
}: {
  category: string;
  imageUrl?: string | null;
  imageAlt?: string;
  size?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const { tone, icon: CoverIcon } = coverFor(category);
  return (
    <div className={`a-cover ${className ?? ''}`} data-tone={tone}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded media, any size
        <img src={imageUrl} alt={imageAlt ?? ''} className="a-cover-img" loading="lazy" />
      ) : (
        <span className="a-cover-medal" style={{ inlineSize: size, blockSize: size }}>
          <CoverIcon size={Math.round(size / 2)} weight="duotone" aria-hidden="true" />
        </span>
      )}
      {children}
    </div>
  );
}
