/**
 * The one list of contact topics. Every `?topic=` link on the site uses one of
 * these keys, the contact form offers exactly these, and the schema accepts
 * nothing else — so a link can never pre-select a topic the form lacks.
 */
export const TOPICS = [
  'general',
  'course',
  'event',
  'sport',
  'volunteer',
  'help',
  'membership',
  'donation',
] as const;

export type Topic = (typeof TOPICS)[number];

/**
 * The topics the contact form offers as choices. Membership and donations have
 * their own forms on the support page, which the contact form links to; a
 * link that arrives with one of them still selects it.
 */
export const CONTACT_FORM_TOPICS = [
  'general',
  'course',
  'event',
  'sport',
  'volunteer',
  'help',
] as const satisfies readonly Topic[];

export function isTopic(value: unknown): value is Topic {
  return typeof value === 'string' && (TOPICS as readonly string[]).includes(value);
}

/** The contact page's address, with the topic (and the item it is about). */
export function contactHref(locale: string, topic: Topic, id?: string): string {
  const query = new URLSearchParams({ topic });
  if (id) query.set('id', id);
  return `/${locale}/contact?${query.toString()}`;
}
