import 'server-only';
import QRCode from 'qrcode';

/**
 * The bank-transfer QR code: the EPC "SEPA Credit Transfer" format (in
 * Austria "Zahlen mit Code", in Germany "GiroCode"), which every Austrian and
 * German banking app opens as a filled-in transfer. The amount is left for
 * the donor to type, so one code serves every gift.
 *
 * Format: EPC069-12, version 002 — the BIC may be left out inside the EEA.
 */
export function epcPayload({
  name,
  iban,
  bic = '',
  text = '',
}: {
  name: string;
  iban: string;
  bic?: string;
  text?: string;
}): string {
  return [
    'BCD',
    '002',
    '1', // UTF-8
    'SCT',
    bic.replace(/\s/g, '').toUpperCase(),
    name.trim().slice(0, 70),
    iban.replace(/\s/g, '').toUpperCase(),
    '', // amount: the donor's choice
    '', // purpose code
    '', // structured reference
    text.trim().slice(0, 140),
  ].join('\n');
}

/** The code as an inline SVG — black on white in both themes, since some
 *  scanners cannot read an inverted code. */
export async function epcQrSvg(input: Parameters<typeof epcPayload>[0]): Promise<string> {
  // The standard asks for error correction level M.
  return QRCode.toString(epcPayload(input), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
