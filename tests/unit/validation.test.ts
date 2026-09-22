import { describe, it, expect } from 'vitest';
import {
  contactSchema,
  membershipSchema,
  donationSchema,
  volunteerSchema,
  antiSpamSchema,
  searchSchema,
  MIN_FILL_MS,
} from '@/lib/validation/forms';
import {
  credentialsSchema,
  passwordSchema,
  userCreateSchema,
  userUpdateSchema,
} from '@/lib/validation/auth';
import {
  fieldUpdateSchema,
  baseFieldUpdateSchema,
  listOpSchema,
  settingsSchema,
  backupSchema,
  entityKindSchema,
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
} from '@/lib/validation/content';
import { ENTITIES } from '@/lib/db/entity-map';

const validContact = {
  name: 'Maryam Hosseini',
  email: 'maryam@example.at',
  phone: '+43 660 1234567',
  topic: 'courses' as const,
  message: 'Ich möchte mich für den Deutschkurs anmelden.',
  locale: 'de' as const,
  website: '',
  elapsed: 9000,
};

describe('contact form', () => {
  it('accepts a well-formed submission', () => {
    expect(contactSchema.safeParse(validContact).success).toBe(true);
  });

  it('accepts a Persian submission', () => {
    const result = contactSchema.safeParse({
      ...validContact,
      name: 'مریم حسینی',
      message: 'سلام، می‌خواهم در کلاس آلمانی ثبت‌نام کنم.',
      locale: 'fa',
    });
    expect(result.success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    const result = contactSchema.safeParse({ ...validContact, name: '  Ali  ' });
    expect(result.success && result.data.name).toBe('Ali');
  });

  it('rejects a missing name with a catalogue key', () => {
    const result = contactSchema.safeParse({ ...validContact, name: '' });
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.issues[0]?.message).toBe(
      'form.errors.nameRequired',
    );
  });

  it('rejects an address that is not an address', () => {
    for (const email of ['not-an-email', 'a@', '@b.at', 'a b@c.at', '']) {
      expect(contactSchema.safeParse({ ...validContact, email }).success, email).toBe(false);
    }
  });

  it('accepts phone numbers in the shapes people actually write', () => {
    for (const phone of ['+43 1 234 56 78', '0660/1234567', '(01) 234-5678', '']) {
      expect(contactSchema.safeParse({ ...validContact, phone }).success, phone).toBe(true);
    }
  });

  it('rejects a phone number carrying letters', () => {
    expect(contactSchema.safeParse({ ...validContact, phone: 'ruf mich an' }).success).toBe(false);
  });

  it('rejects a message that is too short or absurdly long', () => {
    expect(contactSchema.safeParse({ ...validContact, message: 'hi' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...validContact, message: 'x'.repeat(5001) }).success).toBe(
      false,
    );
  });

  it('rejects a topic that is not one of the offered ones', () => {
    expect(contactSchema.safeParse({ ...validContact, topic: 'anything' }).success).toBe(false);
  });

  it('rejects a locale the site does not have', () => {
    expect(contactSchema.safeParse({ ...validContact, locale: 'en' }).success).toBe(false);
  });

  it('defaults the anti-spam fields when a no-JavaScript client omits them', () => {
    const { website: _w, elapsed: _e, ...withoutTraps } = validContact;
    const result = contactSchema.safeParse(withoutTraps);
    expect(result.success).toBe(true);
    expect(result.success && result.data.website).toBe('');
    expect(result.success && result.data.elapsed).toBe(0);
  });

  it('parses the honeypot and timer without judging them', () => {
    // The schema accepts a filled honeypot; the action decides what it means,
    // so a tripped trap can return the same success a real submission does.
    const result = antiSpamSchema.safeParse({ website: 'http://spam.example', elapsed: 40 });
    expect(result.success).toBe(true);
    expect(MIN_FILL_MS).toBeGreaterThan(1000);
  });
});

describe('membership, donation and volunteer forms', () => {
  it('requires a tier', () => {
    const base = { ...validContact, tier: 'ordentlich' };
    expect(membershipSchema.safeParse(base).success).toBe(true);
    expect(membershipSchema.safeParse({ ...base, tier: '' }).success).toBe(false);
  });

  it('allows an empty message on membership and donation', () => {
    expect(
      membershipSchema.safeParse({ ...validContact, tier: 'familie', message: '' }).success,
    ).toBe(true);
    expect(
      donationSchema.safeParse({ ...validContact, purpose: 'Kinderkurse', message: '' }).success,
    ).toBe(true);
  });

  it('requires a message on the volunteer form', () => {
    expect(volunteerSchema.safeParse({ ...validContact, message: '' }).success).toBe(false);
    expect(volunteerSchema.safeParse(validContact).success).toBe(true);
  });
});

describe('search', () => {
  it('needs at least two characters', () => {
    expect(searchSchema.safeParse({ query: 'a', locale: 'de' }).success).toBe(false);
    expect(searchSchema.safeParse({ query: 'ab', locale: 'de' }).success).toBe(true);
    // A single Persian word is two characters or more.
    expect(searchSchema.safeParse({ query: 'دعا', locale: 'fa' }).success).toBe(true);
  });

  it('rejects an over-long query rather than passing it to the database', () => {
    expect(searchSchema.safeParse({ query: 'x'.repeat(121), locale: 'de' }).success).toBe(false);
  });
});

describe('credentials and passwords', () => {
  it('accepts a real login', () => {
    expect(
      credentialsSchema.safeParse({ email: 'redaktion@example.at', password: 'x' }).success,
    ).toBe(true);
  });

  it('lower-cases the address on user creation so logins are case-insensitive', () => {
    const result = userCreateSchema.safeParse({
      email: 'Redaktion@Example.AT',
      name: 'Redaktion',
      role: 'admin',
      password: 'ein langer satz als passwort',
    });
    expect(result.success && result.data.email).toBe('redaktion@example.at');
  });

  it('requires twelve characters rather than a character-class puzzle', () => {
    expect(passwordSchema.safeParse('kurz').success).toBe(false);
    expect(passwordSchema.safeParse('elfzeichen!').success).toBe(false);
    expect(passwordSchema.safeParse('ein langer satz als passwort').success).toBe(true);
  });

  it('only accepts the two real roles', () => {
    const base = { email: 'a@b.at', name: 'A', password: 'ein langer satz als passwort' };
    expect(userCreateSchema.safeParse({ ...base, role: 'editor' }).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...base, role: 'superuser' }).success).toBe(false);
  });

  it('allows a partial user update', () => {
    const id = '6f8c2b1a-0000-4000-8000-000000000000';
    expect(userUpdateSchema.safeParse({ id, role: 'admin' }).success).toBe(true);
    expect(userUpdateSchema.safeParse({ id }).success).toBe(true);
    expect(userUpdateSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});

describe('content writes', () => {
  const id = '6f8c2b1a-0000-4000-8000-000000000000';

  it('accepts a field update for a known entity', () => {
    expect(
      fieldUpdateSchema.safeParse({
        entity: 'course',
        id,
        field: 'title',
        locale: 'fa',
        value: 'آلمانی از پایه',
      }).success,
    ).toBe(true);
  });

  it('rejects an entity that is not in the closed set', () => {
    expect(
      fieldUpdateSchema.safeParse({ entity: 'users', id, field: 'title', locale: 'de', value: 'x' })
        .success,
    ).toBe(false);
  });

  it('rejects a field name that is not an identifier', () => {
    // The field name reaches a column lookup, so anything with punctuation in
    // it is refused before it gets there.
    for (const field of ['title; drop table users', 'a-b', '1title', '', 'a'.repeat(65)]) {
      expect(
        fieldUpdateSchema.safeParse({ entity: 'course', id, field, locale: 'de', value: 'x' })
          .success,
        field,
      ).toBe(false);
    }
  });

  it('rejects an id that is not a uuid', () => {
    expect(
      fieldUpdateSchema.safeParse({
        entity: 'course',
        id: '1 OR 1=1',
        field: 'title',
        locale: 'de',
        value: 'x',
      }).success,
    ).toBe(false);
  });

  it('caps the value so a single field cannot carry a whole document', () => {
    const tooLong = {
      entity: 'course',
      id,
      field: 'body',
      locale: 'de',
      value: 'x'.repeat(20_001),
    };
    expect(fieldUpdateSchema.safeParse(tooLong).success).toBe(false);
  });

  it('accepts base-field updates of every scalar kind', () => {
    for (const value of ['language', 42, true, null]) {
      expect(
        baseFieldUpdateSchema.safeParse({ entity: 'course', id, field: 'category', value }).success,
      ).toBe(true);
    }
  });

  it('accepts only the five list operations', () => {
    for (const op of ['add', 'duplicate', 'delete', 'moveUp', 'moveDown']) {
      expect(listOpSchema.safeParse({ entity: 'offer', op, id }).success, op).toBe(true);
    }
    expect(listOpSchema.safeParse({ entity: 'offer', op: 'truncate', id }).success).toBe(false);
  });

  it('lets add omit the id, since there is no row yet', () => {
    expect(listOpSchema.safeParse({ entity: 'offer', op: 'add' }).success).toBe(true);
  });
});

describe('entity map', () => {
  it('has a definition for every entity the schemas accept', () => {
    for (const kind of entityKindSchema.options) {
      expect(ENTITIES[kind], kind).toBeDefined();
      expect(ENTITIES[kind].base.length).toBeGreaterThan(0);
      expect(ENTITIES[kind].translations.length).toBeGreaterThan(0);
      expect(ENTITIES[kind].fk.length).toBeGreaterThan(0);
      expect(ENTITIES[kind].tag.length).toBeGreaterThan(0);
    }
  });

  it('maps every field name to a snake_case column', () => {
    for (const [kind, definition] of Object.entries(ENTITIES)) {
      for (const [name, column] of Object.entries(definition.fields)) {
        expect(column, `${kind}.${name}`).toMatch(/^[a-z][a-z0-9_]*$/);
      }
      for (const [name, column] of Object.entries(definition.baseFields)) {
        expect(column, `${kind}.${name}`).toMatch(/^[a-z][a-z0-9_]*$/);
      }
    }
  });

  it('supplies every NOT NULL key a blank row needs', () => {
    // "Neuer Eintrag" inserts a row with only the entity map's defaults. Any
    // table with a NOT NULL column that has no database default must therefore
    // declare a `required()` generator, or the button fails outright — which
    // it did, on four of the areas, until this was caught.
    const needsKey: Record<string, string[]> = {
      course: ['slug'],
      event: ['slug', 'starts_at'],
      dua: ['slug'],
      membership: ['tier_key'],
    };

    for (const [kind, columns] of Object.entries(needsKey)) {
      const definition = ENTITIES[kind as keyof typeof ENTITIES];
      expect(definition.required, `${kind} must declare required()`).toBeDefined();
      const row = definition.required!();
      for (const column of columns) {
        expect(row[column], `${kind}.${column}`).toBeDefined();
        expect(String(row[column]).length).toBeGreaterThan(0);
      }
    }
  });

  it('generates a fresh key per call, so two additions cannot collide', () => {
    for (const kind of ['course', 'event', 'dua', 'membership'] as const) {
      const make = ENTITIES[kind].required!;
      const keys = new Set(Array.from({ length: 50 }, () => JSON.stringify(make())));
      expect(keys.size, `${kind} generated a duplicate`).toBe(50);
    }
  });

  it('passes a date as an ISO string, not a Date object', () => {
    // postgres.js's column-object helper does not serialise a Date in this
    // position and throws on it.
    const row = ENTITIES.event.required!();
    expect(typeof row.starts_at).toBe('string');
    expect(() => new Date(row.starts_at as string).toISOString()).not.toThrow();
  });

  it('orders every list the editor shows', () => {
    // Without `sort` or an explicit order the query falls back to ORDER BY 1 —
    // the primary key — and the editor sees its entries reshuffled each load.
    for (const [kind, definition] of Object.entries(ENTITIES)) {
      expect(
        definition.sortable || definition.order,
        `${kind} has neither a sort column nor an explicit order`,
      ).toBeTruthy();
    }
  });

  it('never exposes a table or column name that came from a request', () => {
    // Table and column identifiers are only ever read out of this map, so an
    // entity or field the map does not list simply cannot be addressed.
    const tables = Object.values(ENTITIES).flatMap((d) => [d.base, d.translations]);
    for (const table of tables) expect(table).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

describe('settings', () => {
  const valid = {
    defaultLocale: 'fa' as const,
    defaultTheme: 'light' as const,
    showOpeningEvent: true,
    contactEmail: 'info@example.at',
    phone: '+43 1 000 00 00',
    address: 'Sautergasse 34–38, 1170 Wien',
    iban: 'AT00 0000 0000 0000 0000',
    mapUrl: 'https://www.openstreetmap.org/?mlat=48.2175',
  };

  it('accepts a complete settings row', () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true);
  });

  it('allows the optional fields to be empty', () => {
    expect(
      settingsSchema.safeParse({ ...valid, contactEmail: '', mapUrl: '', iban: '' }).success,
    ).toBe(true);
  });

  it('rejects an IBAN that is not shaped like one', () => {
    expect(settingsSchema.safeParse({ ...valid, iban: '1234 5678' }).success).toBe(false);
  });

  it('rejects a map link that is not a URL', () => {
    expect(settingsSchema.safeParse({ ...valid, mapUrl: 'openstreetmap.org' }).success).toBe(false);
  });
});

describe('backup envelope', () => {
  it('accepts a well-formed export', () => {
    expect(
      backupSchema.safeParse({
        version: 1,
        exportedAt: new Date().toISOString(),
        tables: { pages: [{ id: 'x', key: 'home' }] },
      }).success,
    ).toBe(true);
  });

  it('rejects an unrelated JSON file', () => {
    expect(backupSchema.safeParse({ hello: 'world' }).success).toBe(false);
    expect(backupSchema.safeParse({ version: 2, exportedAt: '', tables: {} }).success).toBe(false);
    expect(backupSchema.safeParse([]).success).toBe(false);
  });
});

describe('upload limits', () => {
  it('allows only real image types', () => {
    expect(ALLOWED_UPLOAD_MIME).toContain('image/jpeg');
    expect(ALLOWED_UPLOAD_MIME).toContain('image/webp');
    expect(ALLOWED_UPLOAD_MIME as readonly string[]).not.toContain('image/svg+xml');
    // SVG is excluded on purpose: it can carry script.
    expect(ALLOWED_UPLOAD_MIME as readonly string[]).not.toContain('application/pdf');
  });

  it('caps uploads at 8 MB', () => {
    expect(MAX_UPLOAD_BYTES).toBe(8 * 1024 * 1024);
  });
});
