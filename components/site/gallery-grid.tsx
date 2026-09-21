'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react/dist/ssr';
import { FilterChips } from './filter-chips';
import { Button } from '../ui/button';
import type { GalleryEntry } from '@/lib/db/queries/content';

/**
 * The filterable image grid and its lightbox.
 *
 * Images are lazy by default; only the first row is eager, so the largest
 * contentful paint is not waiting on something below the fold. Every tile
 * reserves its box from the stored dimensions, which is what keeps CLS at
 * zero on a page that is almost entirely images.
 */
export function GalleryGrid({ items }: { items: GalleryEntry[] }) {
  const t = useTranslations('gallery');
  const [active, setActive] = useState('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items],
  );

  const visible = useMemo(
    () => (active === 'all' ? items : items.filter((item) => item.category === active)),
    [items, active],
  );

  const close = useCallback(() => {
    setOpenIndex(null);
    openerRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return null;
        return (current + delta + visible.length) % visible.length;
      });
    },
    [visible.length],
  );

  // Keyboard: Escape closes, arrows step. Mirrored in RTL so "next" always
  // means the next image in reading order, whichever way that points.
  useEffect(() => {
    if (openIndex === null) return;
    const rtl = document.documentElement.dir === 'rtl';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(rtl ? -1 : 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(rtl ? 1 : -1);
      } else if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.querySelector('button')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openIndex, close, step]);

  const current = openIndex === null ? null : visible[openIndex];

  return (
    <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
      <FilterChips
        categories={categories}
        active={active}
        onChange={(value) => {
          setActive(value);
          setOpenIndex(null);
        }}
        label={t('filterByCategory')}
        labelNamespace="gallery"
      />

      {visible.length === 0 ? (
        <p style={{ color: 'var(--color-ink-muted)' }}>{t('none')}</p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gap: 'var(--space-3)',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(16rem, 100%), 1fr))',
          }}
        >
          {visible.map((item, index) => (
            <li key={item.id} data-rise>
              <button
                type="button"
                onClick={(event) => {
                  openerRef.current = event.currentTarget;
                  setOpenIndex(index);
                }}
                aria-label={`${t('open')}: ${item.alt || item.caption}`}
                style={{
                  display: 'block',
                  inlineSize: '100%',
                  padding: 0,
                  border: 0,
                  background: 'none',
                  cursor: 'zoom-in',
                  borderRadius: 'var(--radius-soft)',
                  overflow: 'hidden',
                }}
              >
                <span className="cmyk-wrap" style={{ display: 'block' }}>
                  <Image
                    src={item.url}
                    alt={item.alt}
                    width={item.width || 800}
                    height={item.height || 600}
                    sizes="(max-width: 48rem) 100vw, (max-width: 72rem) 50vw, 33vw"
                    loading={index < 3 ? 'eager' : 'lazy'}
                    priority={index === 0}
                    placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                    blurDataURL={item.blurDataUrl ?? undefined}
                    className="cmyk"
                    style={{ inlineSize: '100%', blockSize: 'auto', objectFit: 'cover' }}
                  />
                </span>
                {item.caption ? (
                  <span
                    className="text-xs"
                    style={{
                      display: 'block',
                      textAlign: 'start',
                      paddingBlockStart: 'var(--space-1)',
                      color: 'var(--color-ink-muted)',
                    }}
                  >
                    {item.caption}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {current ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('lightbox')}
          className="fixed inset-0"
          style={{
            zIndex: 'var(--z-dialog)',
            background: 'oklch(0.2369 0.0036 48.57 / 0.92)',
            display: 'grid',
            placeItems: 'center',
            padding: 'var(--space-4)',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            style={{ display: 'grid', gap: 'var(--space-3)', maxInlineSize: 'min(64rem, 100%)' }}
          >
            <div className="flex items-center gap-2">
              <span className="kicker" style={{ color: 'var(--color-bg)' }} aria-live="polite">
                {t('counter', { index: openIndex! + 1, total: visible.length })}
              </span>
              <div className="ms-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={t('previous')}
                  onClick={() => step(-1)}
                  style={{ color: 'var(--color-bg)' }}
                >
                  <CaretLeft
                    size={20}
                    weight="bold"
                    aria-hidden="true"
                    className="rtl:rotate-180"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={t('next')}
                  onClick={() => step(1)}
                  style={{ color: 'var(--color-bg)' }}
                >
                  <CaretRight
                    size={20}
                    weight="bold"
                    aria-hidden="true"
                    className="rtl:rotate-180"
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  aria-label={t('close')}
                  onClick={close}
                  style={{ color: 'var(--color-bg)' }}
                >
                  <X size={20} weight="bold" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <Image
              src={current.url}
              alt={current.alt}
              width={current.width || 1600}
              height={current.height || 1200}
              sizes="100vw"
              style={{
                inlineSize: '100%',
                blockSize: 'auto',
                maxBlockSize: '75vh',
                objectFit: 'contain',
                borderRadius: 'var(--radius-soft)',
              }}
            />

            {current.caption ? (
              <p style={{ color: 'var(--color-bg)', fontSize: 'var(--text-sm)' }}>
                {current.caption}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
