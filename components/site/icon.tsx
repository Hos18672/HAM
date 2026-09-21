import * as Icons from '@phosphor-icons/react/dist/ssr';
import type { IconProps } from '@phosphor-icons/react';

/**
 * Icons by name, so an admin can pick one from a text field without the app
 * having to import the whole Phosphor set eagerly. Duotone is the weight the
 * design system specifies.
 */
export function Icon({
  name,
  size = 28,
  ...props
}: { name: string } & Omit<IconProps, 'ref'>) {
  const registry = Icons as unknown as Record<string, React.ComponentType<IconProps>>;
  const Component = registry[name] ?? registry.Sparkle;
  if (!Component) return null;
  return <Component size={size} weight="duotone" aria-hidden="true" {...props} />;
}

/** The names offered in the admin's icon picker. */
export const ICON_CHOICES = [
  'BookOpen',
  'HandsPraying',
  'Volleyball',
  'MaskHappy',
  'Handshake',
  'UsersThree',
  'Heart',
  'Sparkle',
  'Compass',
  'Moon',
  'Star',
  'Coffee',
  'MusicNotes',
  'PaintBrush',
  'Translate',
  'GraduationCap',
] as const;
