'use strict';

const { PermissionFlagsBits } = require('discord.js');
const configManager = require('./configManager');

const ROLES = { USER: 0, MODERATOR: 1, ADMIN: 2, OWNER: 3 };

/**
 * Kullanicinin etkilesim baglaminda hangi yetki seviyesinde oldugunu belirler.
 * OWNER: ayarlar.json ownerIds listesinde olan kullanicilar.
 * ADMIN: Discord "Yonetici" (Administrator) izni olanlar.
 * MODERATOR: guildSettings.permissions.moderatorRoleIds icinde rolu olanlar.
 * USER: digerleri.
 */
function resolveLevel(interaction, guildSettings) {
  const config = configManager.get();
  const ownerIds = Array.isArray(config.ownerIds) ? config.ownerIds : [];

  if (ownerIds.includes(interaction.user.id)) return ROLES.OWNER;

  const member = interaction.member;
  if (member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
    return ROLES.ADMIN;
  }

  const moderatorRoleIds = guildSettings?.permissions?.moderatorRoleIds || [];
  const memberRoleIds = member?.roles?.cache
    ? [...member.roles.cache.keys()]
    : Array.isArray(member?.roles) ? member.roles : [];

  if (moderatorRoleIds.some((r) => memberRoleIds.includes(r))) {
    return ROLES.MODERATOR;
  }

  return ROLES.USER;
}

function hasAtLeast(interaction, guildSettings, requiredRoleName) {
  const required = ROLES[requiredRoleName];
  if (required === undefined) throw new Error(`Bilinmeyen yetki seviyesi: ${requiredRoleName}`);
  return resolveLevel(interaction, guildSettings) >= required;
}

module.exports = { ROLES, resolveLevel, hasAtLeast };
