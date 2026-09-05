'use strict';

const { isValidDiscordId, isValidHttpUrl } = require('./security');

function isValidPlatform(value) {
  return ['youtube', 'twitch', 'tiktok', 'instagram', 'x'].includes(value);
}

function isValidEnum(value, allowed) {
  return allowed.includes(value);
}

function isValidBoolean(value) {
  return typeof value === 'boolean';
}

function isValidPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

const TIME_HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTimeHHMM(value) {
  return typeof value === 'string' && TIME_HHMM_REGEX.test(value);
}

function isValidIsoDate(value) {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

module.exports = {
  isValidDiscordId,
  isValidHttpUrl,
  isValidPlatform,
  isValidEnum,
  isValidBoolean,
  isValidPositiveInt,
  isValidTimeHHMM,
  isValidIsoDate
};
