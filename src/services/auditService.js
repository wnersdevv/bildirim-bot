'use strict';

const auditRepo = require('../database/repositories/auditRepo');
const { makeLogger } = require('../core/logger');

const logger = makeLogger('AuditService');

async function log({ guildId, userId, action, target = '', before = null, after = null, result = 'SUCCESS' }) {
  logger.audit(`${action} -> ${target}`, { guildId, userId, result });
  try {
    await auditRepo.record({ guildId, userId, action, target, before, after, result });
  } catch (err) {
    logger.error('Audit kaydi yazilamadi.', { error: err.message });
  }
}

async function recent(guildId, limit = 20) {
  return auditRepo.listRecent(guildId, limit);
}

module.exports = { log, recent };
