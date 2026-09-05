'use strict';

/**
 * Sablon degiskenlerini ({channelName}, {title} vb.) degerlerle degistirir.
 * Desteklenmeyen/bilinmeyen degisken botu cokertmez, oldugu gibi birakilir
 * ya da bos string ile degistirilir (config'e gore).
 */
function renderTemplate(template, variables) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      const value = variables[key];
      return value === undefined || value === null ? '' : String(value);
    }
    return match; // bilinmeyen degisken - oldugu gibi birak
  });
}

function truncate(text, maxLength) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function formatNumber(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('tr-TR').format(n);
}

const EVENT_LABELS_TR = {
  new_video: 'Yeni Video',
  live_started: 'Canlı Yayın Başladı',
  live_ended: 'Yayın Bitti',
  shorts: 'Yeni Shorts',
  community_post: 'Topluluk Gönderisi',
  new_post: 'Yeni Gönderi',
  story: 'Yeni Story',
  announcement: 'Duyuru',
  scheduled_announcement: 'Planlı Duyuru',
  system_announcement: 'Sistem Duyurusu',
  urgent_announcement: 'Acil Duyuru',
  manual: 'Manuel Bildirim',
  test: 'Test Bildirimi'
};

function eventLabelTr(eventType) {
  return EVENT_LABELS_TR[eventType] || eventType;
}

module.exports = { renderTemplate, truncate, formatNumber, eventLabelTr };
