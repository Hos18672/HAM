import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { epcPayload } = await import('@/lib/epc-qr');

describe('epcPayload', () => {
  it('writes the EPC v002 transfer with no amount, so the donor chooses', () => {
    const lines = epcPayload({
      name: 'H.A.M. (Haus aller Menschen) - Vere',
      iban: 'AT29 2011 1856 5232 9900',
      text: 'Spende',
    }).split('\n');
    expect(lines).toEqual([
      'BCD',
      '002',
      '1',
      'SCT',
      '',
      'H.A.M. (Haus aller Menschen) - Vere',
      'AT292011185652329900',
      '',
      '',
      '',
      'Spende',
    ]);
  });

  it('keeps the name within the 70 characters a transfer carries', () => {
    const name = epcPayload({ name: 'x'.repeat(90), iban: 'AT29 2011' }).split('\n')[5];
    expect(name).toHaveLength(70);
  });
});
