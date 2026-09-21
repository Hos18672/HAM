'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';

const LINKS = [
  { href: '/admin', label: 'Übersicht', exact: true },
  { href: '/admin/content/pages', label: 'Inhalte', match: '/admin/content' },
  { href: '/admin/media', label: 'Medien' },
  { href: '/admin/submissions', label: 'Posteingang' },
  { href: '/admin/settings', label: 'Einstellungen' },
  { href: '/admin/backup', label: 'Sicherung' },
  { href: '/admin/audit', label: 'Protokoll' },
];

export function AdminNav({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();

  const isActive = (link: (typeof LINKS)[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.match ?? link.href);

  return (
    <>
      <nav className="nav flex-wrap" aria-label="Verwaltung">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn('nav-link')}
            aria-current={isActive(link) ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
        {/* User management is the one admin-only area. */}
        {role === 'admin' ? (
          <Link
            href="/admin/users"
            className="nav-link"
            aria-current={pathname.startsWith('/admin/users') ? 'page' : undefined}
          >
            Benutzer
          </Link>
        ) : null}
      </nav>

      <div className="ms-auto flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          {userName}
        </span>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
          Abmelden
        </Button>
      </div>
    </>
  );
}
