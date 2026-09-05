'use strict';

const DEFAULT_TIMEZONE = 'Europe/Istanbul';

/**
 * Belirli bir timezone'da "su an saat kac" bilgisini HH:MM olarak dondurur.
 */
function nowInTimezone(timezone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(new Date());
}

/** quietHours = { start: "23:00", end: "08:00" } bicimini destekler (gece asimi dahil). */
function isWithinQuietHours(quietHours, timezone = DEFAULT_TIMEZONE) {
  if (!quietHours || !quietHours.enabled) return false;
  const current = nowInTimezone(timezone);
  const { start, end } = quietHours;
  if (!start || !end) return false;

  if (start <= end) {
    return current >= start && current < end;
  }
  // Gece yarisini asan araliklar (orn 23:00 - 08:00)
  return current >= start || current < end;
}

function formatDateTime(date, timezone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date instanceof Date ? date : new Date(date));
}

module.exports = { DEFAULT_TIMEZONE, nowInTimezone, isWithinQuietHours, formatDateTime };
