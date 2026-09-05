'use strict';

const SECRET_KEYS = new Set(['token', 'apikey', 'clientsecret', 'mongouri', 'secret', 'password']);

/**
 * Log/mesajlarda gizli alanlari maskeler. Nesneleri recursive tarar.
 */
function maskSecrets(input) {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    return input.length <= 6 ? '***' : `${input.slice(0, 3)}***${input.slice(-2)}`;
  }

  if (Array.isArray(input)) {
    return input.map(maskSecrets);
  }

  if (typeof input === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = key.toLowerCase();
      if (SECRET_KEYS.has(normalizedKey)) {
        out[key] = typeof value === 'string' && value ? maskSecrets(value) : '(bos)';
      } else if (typeof value === 'object' && value !== null) {
        out[key] = maskSecrets(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  return input;
}

const DISCORD_ID_REGEX = /^[0-9]{15,25}$/;

function isValidDiscordId(value) {
  return typeof value === 'string' && DISCORD_ID_REGEX.test(value);
}

function isValidHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Kullanici tarafindan verilen URL'lerin sadece izin verilen platform
 * hostlarina ait olup olmadigini kontrol eder. Korlemesine fetch onlenir.
 */
function isAllowedPlatformHost(url, allowedHosts) {
  if (!isValidHttpUrl(url)) return false;
  try {
    const { hostname } = new URL(url);
    return allowedHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Basit injection/kontrol karakteri temizligi (Discord mesaj/etiket girdileri icin).
 */
function sanitizeText(value, maxLength = 4000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .slice(0, maxLength);
}

module.exports = {
  maskSecrets,
  isValidDiscordId,
  isValidHttpUrl,
  isAllowedPlatformHost,
  sanitizeText
};
