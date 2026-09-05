'use strict';

/**
 * Mention icerigini olusturur. @everyone/@here sadece acikca izinliyse
 * ve cagiran taraf (komut katmani) OWNER/ADMIN yetkisini dogrulamissa kullanilir.
 * Bu servis kendi basina yetki kontrolu YAPMAZ; permissionManager sorumludur.
 */
function buildMentionContent({ mentionType, roleId }) {
  switch (mentionType) {
    case 'everyone':
      return { content: '@everyone', allowedMentions: { parse: ['everyone'] } };
    case 'here':
      return { content: '@here', allowedMentions: { parse: ['everyone'] } };
    case 'role':
      if (!roleId) return { content: '', allowedMentions: { parse: [] } };
      return { content: `<@&${roleId}>`, allowedMentions: { roles: [roleId] } };
    default:
      return { content: '', allowedMentions: { parse: [] } };
  }
}

module.exports = { buildMentionContent };
