'use strict';

const { makeLogger } = require('../core/logger');
const { sharedRateLimiter } = require('../core/rateLimiter');
const guildSettingsRepo = require('../database/repositories/guildSettingsRepo');
const wizardSession = require('../core/wizardSession');
const { buildWizardPanel } = require('../components/panels/wizardPanel');
const { buildWelcomePanel } = require('../components/panels/setupPanel');
const { buildSystemPanel } = require('../components/panels/systemPanel');
const healthService = require('../services/healthService');
const stateManager = require('../core/stateManager');
const permissionManager = require('../core/permissionManager');

const logger = makeLogger('InteractionCreate');

const name = 'interactionCreate';
const once = false;

async function execute(interaction, context) {
  try {
    if (interaction.isChatInputCommand()) {
      return await handleCommand(interaction, context);
    }
    if (interaction.isButton()) {
      return await handleButton(interaction, context);
    }
    if (interaction.isChannelSelectMenu() || interaction.isRoleSelectMenu() || interaction.isStringSelectMenu()) {
      return await handleSelect(interaction, context);
    }
    if (interaction.isModalSubmit()) {
      return await handleModal(interaction, context);
    }
  } catch (err) {
    logger.error('Etkilesim islenirken beklenmeyen hata (bot cokmedi).', { error: err.message, customId: interaction.customId });
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.', ephemeral: true }).catch(() => {});
    }
  }
}

async function handleCommand(interaction, context) {
  const command = context.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({ content: '⚠️ Bu komut artık kullanılamıyor.', ephemeral: true });
  }

  // Komut bazli rate limit: kullanici basina 5 saniyede 3 komut.
  const rlKey = `command:${interaction.commandName}:${interaction.user.id}`;
  if (!sharedRateLimiter.allow(rlKey, 3, 5000)) {
    return interaction.reply({ content: '⏳ Çok hızlı komut gönderiyorsunuz, lütfen birkaç saniye bekleyin.', ephemeral: true });
  }

  await command.execute(interaction, context);
}

async function handleButton(interaction, context) {
  const [scope, action, extra] = interaction.customId.split(':');
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (scope === 'setup') {
    if (action === 'start') {
      wizardSession.start(guildId, userId);
      const panel = buildWizardPanel('bildirim', 0);
      return interaction.reply({ ...panel, ephemeral: true });
    }
    return interaction.reply({ content: `ℹ️ İlgili ayarları /${action} komutlarıyla yönetebilirsiniz.`, ephemeral: true });
  }

  if (scope === 'wizard') {
    return handleWizardButton(interaction, action, extra);
  }

  if (scope === 'system') {
    const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));
    if (!permissionManager.hasAtLeast(interaction, guildSettings, 'ADMIN')) {
      return interaction.reply({ content: '⛔ Bu işlem için yetkiniz yok.', ephemeral: true });
    }
    if (action === 'refresh') {
      const status = await healthService.getStatus(interaction.client, context.queueManager);
      const panel = buildSystemPanel(status);
      return interaction.update(panel);
    }
    if (action === 'killswitch') {
      return interaction.reply({
        content: '🛑 Kill-switch değiştirmek için `/sistem kill-switch` komutunu kullanın.',
        ephemeral: true
      });
    }
  }

  return interaction.reply({ content: 'Bilinmeyen etkileşim.', ephemeral: true });
}

async function handleWizardButton(interaction, action, extra) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (action === 'cancel') {
    wizardSession.cancel(guildId, userId);
    return interaction.update({ content: '✖️ Kurulum iptal edildi.', components: [], embeds: [] });
  }

  if (action === 'back') {
    wizardSession.back(guildId, userId);
  } else if (action === 'next') {
    const session = wizardSession.get(guildId, userId);
    if (session && session.stepIndex === wizardSession.STEPS.length - 1) {
      await applyWizardResult(guildId, userId, interaction);
      wizardSession.cancel(guildId, userId);
      return interaction.update({ content: '✅ Kurulum tamamlandı! `/bildirim durum` ile kontrol edebilirsiniz.', components: [], embeds: [] });
    }
    wizardSession.next(guildId, userId);
  } else if (action === 'bildirim') {
    wizardSession.update(guildId, userId, { enabled: extra === 'on' });
    wizardSession.next(guildId, userId);
  } else if (action === 'dm') {
    wizardSession.update(guildId, userId, { dmEnabled: extra === 'on' });
    wizardSession.next(guildId, userId);
  } else if (action === 'mention') {
    wizardSession.update(guildId, userId, { mentionEnabled: extra === 'role' });
    wizardSession.next(guildId, userId);
  } else if (action === 'test') {
    const guildSettings = await guildSettingsRepo.getOrCreate(guildId).catch(() => ({}));
    const session = wizardSession.get(guildId, userId);
    const channelId = session?.data?.channelId || guildSettings.defaultChannelId;
    if (channelId) {
      const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
      if (channel) await channel.send({ content: '🧪 Kurulum sihirbazı test bildirimi — WNERSDEV çalışıyor!' }).catch(() => {});
    }
  }

  const step = wizardSession.currentStep(guildId, userId);
  if (!step) {
    return interaction.update({ content: '⚠️ Kurulum oturumu zaman aşımına uğradı, `/bildirim kur` ile yeniden başlatın.', components: [], embeds: [] });
  }
  const session = wizardSession.get(guildId, userId);
  const panel = buildWizardPanel(step, session.stepIndex);
  return interaction.update(panel);
}

async function applyWizardResult(guildId, userId, interaction) {
  const session = wizardSession.get(guildId, userId);
  if (!session) return;
  const patch = {};
  if (session.data.enabled !== undefined) patch.enabled = session.data.enabled;
  if (session.data.channelId) patch.defaultChannelId = session.data.channelId;
  if (session.data.roleId) patch.defaultRoleId = session.data.roleId;
  if (session.data.dmEnabled !== undefined) patch.dmNotifications = session.data.dmEnabled;
  if (session.data.mentionEnabled !== undefined) patch.mentionEnabled = session.data.mentionEnabled;

  if (Object.keys(patch).length > 0) {
    await guildSettingsRepo.update(guildId, patch);
  }
}

async function handleSelect(interaction) {
  const [scope, step] = interaction.customId.split(':');
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  if (scope !== 'wizard') return interaction.reply({ content: 'Bilinmeyen seçim.', ephemeral: true });

  if (step === 'kanal') {
    wizardSession.update(guildId, userId, { channelId: interaction.values[0] });
  } else if (step === 'rol') {
    wizardSession.update(guildId, userId, { roleId: interaction.values[0] });
  } else if (step === 'platform') {
    wizardSession.update(guildId, userId, { platforms: interaction.values });
  }

  const session = wizardSession.get(guildId, userId);
  const currentStep = wizardSession.currentStep(guildId, userId);
  const panel = buildWizardPanel(currentStep, session.stepIndex);
  return interaction.update(panel);
}

async function handleModal(interaction) {
  if (interaction.customId === 'modal:duyuru') {
    const content = interaction.fields.getTextInputValue('duyuru_icerik');
    return interaction.reply({ content: `📝 Duyuru taslağı alındı. Göndermek için: \n\`/duyuru gonder icerik:${content.slice(0, 50)}...\``, ephemeral: true });
  }
  return interaction.reply({ content: 'Bilinmeyen form.', ephemeral: true });
}

module.exports = { name, once, execute };
