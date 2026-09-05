'use strict';

/**
 * ayarlar.json icin varsayilan degerler.
 * Kullanicinin dosyasinda eksik alan varsa buradan tamamlanir.
 * Boylece eksik credential/alan botu cokertmez.
 */
const DEFAULTS = {
  token: '',
  clientId: '',
  mongoUri: '',
  ownerIds: [],
  bot: {
    name: 'WNERSDEV Bildirim',
    language: 'tr',
    debug: false
  },
  notifications: {
    enabled: true,
    channel: { enabled: true, channelId: '' },
    dm: { enabled: false },
    mention: { enabled: true, roleId: '' },
    cooldownSeconds: 60,
    duplicateProtection: true,
    platforms: {
      youtube: {
        enabled: false,
        apiKey: '',
        scanIntervalSeconds: 120,
        videoNotifications: true,
        liveNotifications: true,
        shortsNotifications: true,
        communityNotifications: false,
        channelNotifications: true,
        dmNotifications: false
      },
      twitch: {
        enabled: false,
        clientId: '',
        clientSecret: '',
        scanIntervalSeconds: 60,
        liveNotifications: true,
        offlineNotifications: false,
        channelNotifications: true,
        dmNotifications: false
      },
      tiktok: {
        enabled: false,
        scanIntervalSeconds: 120,
        videoNotifications: true,
        liveNotifications: true,
        channelNotifications: true,
        dmNotifications: false
      },
      instagram: {
        enabled: false,
        scanIntervalSeconds: 120,
        postNotifications: true,
        storyNotifications: false,
        liveNotifications: true,
        channelNotifications: true,
        dmNotifications: false
      },
      x: {
        enabled: false,
        scanIntervalSeconds: 120,
        postNotifications: true,
        replyNotifications: false,
        repostNotifications: false,
        channelNotifications: true,
        dmNotifications: false
      }
    }
  }
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Derin birlestirme: user degerleri defaults'un uzerine yazar,
 * eksik alanlar defaults'tan gelir.
 */
function deepMerge(defaults, override) {
  const result = Array.isArray(defaults) ? [...defaults] : { ...defaults };
  if (!isPlainObject(override)) return result;

  for (const key of Object.keys(override)) {
    const overrideVal = override[key];
    const defaultVal = defaults ? defaults[key] : undefined;
    if (isPlainObject(defaultVal) && isPlainObject(overrideVal)) {
      result[key] = deepMerge(defaultVal, overrideVal);
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal;
    }
  }
  return result;
}

module.exports = { DEFAULTS, deepMerge };
