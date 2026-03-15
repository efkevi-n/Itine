/**
 * Converts ISO 3166-1 alpha-2 country code to regional indicator emoji (flag).
 * Returns "🌍" if code is missing or invalid.
 */
export function getFlagFromCountryCode(code: string | undefined): string {
  if (!code || code.length !== 2) return '🌍';
  const upper = code.toUpperCase();
  const a = 0x1f1e6; // 'A' regional indicator
  const first = upper.charCodeAt(0) - 0x41;
  const second = upper.charCodeAt(1) - 0x41;
  if (first < 0 || first > 25 || second < 0 || second > 25) return '🌍';
  return String.fromCodePoint(a + first, a + second);
}
