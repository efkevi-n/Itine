/**
 * Format start and end dates as "Mar 15 - Mar 20, 2026"
 */
export function formatTripDateRange(startDate: string, endDate: string): string {
  const toDate = (d: string) => {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start || !end) return `${startDate} – ${endDate}`;

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const endStr = end.toLocaleDateString('en-US', opts);
  const sameYear = start.getFullYear() === end.getFullYear();
  if (startStr === endStr) return startStr;
  if (sameYear && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'short' })} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endStr}`;
  }
  return `${startStr} - ${endStr}`;
}
