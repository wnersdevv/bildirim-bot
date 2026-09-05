'use strict';

/**
 * Icerik filtrelemesi: allowlist/blocklist kelime kontrolu.
 * Allowlist doluysa icerik en az bir allowlist kelimesi icermeli.
 * Blocklist'teki herhangi bir kelime varsa icerik reddedilir.
 */
function passesFilters(text, filters) {
  if (!filters) return true;
  const haystack = (text || '').toLowerCase();

  const blocklist = filters.keywordBlocklist || [];
  if (blocklist.some((w) => w && haystack.includes(w.toLowerCase()))) {
    return false;
  }

  const allowlist = filters.keywordAllowlist || [];
  if (allowlist.length > 0) {
    return allowlist.some((w) => w && haystack.includes(w.toLowerCase()));
  }

  return true;
}

module.exports = { passesFilters };
