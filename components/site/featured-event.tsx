import { getTranslations } from 'next-intl/server';
import { EditableText } from '@/components/editable/editable-text';
import { EditableAdd } from '@/components/editable/editable-list';
import { PatternPlate } from './ornaments';
import { LinkButton } from '../ui/button';
import { formatDate, formatTime } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/config';
import type { EventEntry } from '@/lib/db/queries/content';

/**
 * The opening event, as the design leads the events page with it.
 *
 * A gold-bordered article on the band with the girih ground behind it: the
 * invitation and its programme on one side, and on the other a pane of the
 * facts — date, time, place — with the gold call to action under them. The
 * programme markers are the design's small gold diamonds rather than bullets.
 */
export async function FeaturedEvent({
  event,
  locale,
  address,
}: {
  event: EventEntry;
  locale: Locale;
  address: string;
}) {
  const t = await getTranslations({ locale, namespace: 'events' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });

  const label = {
    fontSize: '10.5px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'var(--gold)',
    fontWeight: 'var(--weight-bold)',
  };
  const fact = { marginBlockStart: '6px', fontSize: '17px', fontWeight: 'var(--weight-semibold)' };

  return (
    <article
      className="glow"
      data-rise
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-softer)',
        overflow: 'hidden',
        border: 'var(--rule-hair) solid var(--gold)',
        background: 'var(--band)',
        color: 'var(--bandInk)',
        padding: 'clamp(30px, 4vw, 56px)',
      }}
    >
      <PatternPlate tiling="shesh" opacity={0.6} />

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))',
          gap: 'clamp(26px, 3vw, 52px)',
          alignItems: 'center',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 'var(--weight-bold)',
              color: '#04180f',
              background: 'var(--gold)',
              padding: '7px 15px',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {t('openingEvent')}
          </span>

          <EditableText
            as="h2"
            entity="event"
            id={event.id}
            field="title"
            locale={locale}
            value={event.title}
            style={{
              marginBlockStart: '20px',
              fontSize: 'clamp(27px, 3.6vw, 44px)',
              lineHeight: 1.1,
              color: 'var(--bandHead)',
            }}
            words="hero"
          />

          <EditableText
            as="p"
            entity="event"
            id={event.id}
            field="body"
            locale={locale}
            value={event.body}
            multiline
            style={{
              marginBlockStart: '18px',
              fontSize: '15.5px',
              lineHeight: 1.9,
              color: 'var(--bandDim)',
            }}
          />

          {event.programme.length > 0 ? (
            <>
              <p className="kicker" style={{ marginBlockStart: '26px', color: 'var(--gold)' }}>
                {t('programme')}
              </p>
              <ul
                style={{
                  marginBlockStart: '13px',
                  listStyle: 'none',
                  padding: 0,
                  display: 'grid',
                  gap: '13px',
                }}
              >
                {event.programme.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      fontSize: '15px',
                      lineHeight: 1.7,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 13 13"
                      aria-hidden="true"
                      focusable="false"
                      style={{ marginBlockStart: '6px', flex: '0 0 auto' }}
                    >
                      <path d="M6.5 0 13 6.5 6.5 13 0 6.5Z" fill="var(--gold)" />
                    </svg>
                    <span>
                      <EditableText
                        entity="programme"
                        id={item.id}
                        field="timeLabel"
                        locale={locale}
                        value={item.timeLabel}
                        className="tabular"
                        style={{ color: 'var(--gold)', fontWeight: 'var(--weight-semibold)' }}
                      />{' '}
                      <EditableText
                        entity="programme"
                        id={item.id}
                        field="title"
                        locale={locale}
                        value={item.title}
                      />
                    </span>
                  </li>
                ))}
              </ul>
              <div style={{ marginBlockStart: 'var(--space-3)' }}>
                <EditableAdd entity="programme" parentId={event.id} />
              </div>
            </>
          ) : null}
        </div>

        {/* The facts, on the band's own tinted pane. */}
        <div
          className="surf"
          style={{
            background: 'rgba(200, 164, 93, 0.08)',
            border: 'var(--rule-hair) solid var(--patBand)',
            padding: '28px',
            borderRadius: 'var(--radius-soft)',
          }}
        >
          <div style={{ display: 'grid', gap: '22px' }}>
            <div>
              <div style={label}>{t('date')}</div>
              <div style={fact}>
                <time dateTime={event.startsAt.toISOString()}>
                  {formatDate(event.startsAt, locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </div>
            </div>
            <div>
              <div style={label}>{t('time')}</div>
              <div style={fact} className="tabular">
                {formatTime(event.startsAt, locale)}
                {event.endsAt ? `–${formatTime(event.endsAt, locale)}` : ''}
              </div>
            </div>
            <div>
              <div style={label}>{t('location')}</div>
              <div style={{ ...fact, lineHeight: 1.6 }}>
                {event.location ? (
                  <EditableText
                    entity="event"
                    id={event.id}
                    field="location"
                    locale={locale}
                    value={event.location}
                  />
                ) : (
                  <span className="ltr-island">{address}</span>
                )}
              </div>
            </div>
          </div>

          <LinkButton
            href={`/${locale}/contact?topic=event`}
            className="btn-gold"
            style={{ marginBlockStart: '28px', inlineSize: '100%', justifyContent: 'center' }}
          >
            {tActions('askAboutEvent')}
          </LinkButton>
        </div>
      </div>
    </article>
  );
}
