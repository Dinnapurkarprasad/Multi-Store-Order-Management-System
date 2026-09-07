// Intl does the wording — no date library for "3 minutes ago".
const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/**
 * "3 minutes ago". Safe on created_at / updated_at, which are real ISO
 * timestamps with a zone — unlike analytics' `day`, which is a bare
 * YYYY-MM-DD string and must never go through new Date().
 */
export function relativeTime(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;

  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(-Math.round(seconds / size), unit);
    }
  }
  return "just now";
}
