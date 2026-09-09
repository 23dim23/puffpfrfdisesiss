export function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  
  // If it's already an ISO or valid standard date format containing 'T'
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }
  
  // Try to parse format: DD.MM.YYYY HH:MM
  const match = dateStr.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (match) {
    const [_, day, month, year, hour, minute] = match;
    const d = new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      hour ? parseInt(hour) : 0,
      minute ? parseInt(minute) : 0
    );
    if (!isNaN(d.getTime())) return d;
  }
  
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}
