'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { IdentificationBadge, HandHeart } from '@phosphor-icons/react/dist/ssr';

type Tab = 'member' | 'donate';
const TABS: Tab[] = ['member', 'donate'];

/**
 * Membership and donation as two tabs on one page, each with its own address
 * (`/support#member`, `/support#donate`), so the footer and the header can
 * link straight to either and the back button still works.
 */
export function SupportTabs({ member, donate }: { member: ReactNode; donate: ReactNode }) {
  const t = useTranslations('support');
  const [tab, setTab] = useState<Tab>('member');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const read = () => setTab(window.location.hash === '#donate' ? 'donate' : 'member');
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  function choose(next: Tab, focus = false) {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
    if (focus) listRef.current?.querySelector<HTMLElement>(`#tab-${next}`)?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const index = TABS.indexOf(tab);
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward || event.key === back) {
      event.preventDefault();
      const step = event.key === forward ? 1 : -1;
      choose(TABS[(index + step + TABS.length) % TABS.length]!, true);
    }
  }

  return (
    <div className="support-tabs">
      <div
        ref={listRef}
        role="tablist"
        aria-label={t('tabsLabel')}
        className="support-tablist"
        onKeyDown={onKeyDown}
      >
        {TABS.map((key) => {
          const Icon = key === 'member' ? IdentificationBadge : HandHeart;
          return (
            <button
              key={key}
              id={`tab-${key}`}
              type="button"
              role="tab"
              aria-selected={tab === key}
              aria-controls={key}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => choose(key)}
            >
              <Icon size={20} weight="duotone" aria-hidden="true" />
              {key === 'member' ? t('membership') : t('donation')}
            </button>
          );
        })}
      </div>
      {/* Both panels keep their anchors so a link to either lands here. */}
      <div id="member" role="tabpanel" aria-labelledby="tab-member" hidden={tab !== 'member'}>
        {member}
      </div>
      <div id="donate" role="tabpanel" aria-labelledby="tab-donate" hidden={tab !== 'donate'}>
        {donate}
      </div>
    </div>
  );
}
