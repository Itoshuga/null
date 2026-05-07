const {
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");

function getStatisticsService() {
  return require("../../services/statisticsService");
}

function getCharacterService() {
  return require("../../services/characterService");
}

function canManageServer(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function shouldUsePrivateResponse(subcommand) {
  return ["create", "edit", "delete"].includes(subcommand);
}

async function deferStatsReply(interaction, isPrivateResponse) {
  if (interaction.deferred || interaction.replied) {
    return;
  }

  try {
    await interaction.deferReply(isPrivateResponse ? { flags: MessageFlags.Ephemeral } : {});
  } catch (error) {
    if (error.code !== 40060) {
      throw error;
    }
  }
}

async function sendStatsResponse(interaction, payload) {
  try {
    if (interaction.deferred) {
      await interaction.editReply(removeReplyOnlyOptions(payload));
      return;
    }

    if (interaction.replied) {
      await interaction.followUp(payload);
      return;
    }

    await interaction.reply(payload);
  } catch (error) {
    if (error.code === 40060) {
      await interaction.followUp(payload);
      return;
    }

    throw error;
  }
}

function removeReplyOnlyOptions(payload) {
  const { flags, ...editablePayload } = payload;

  return editablePayload;
}

async function replyWithError(interaction, message) {
  await sendStatsResponse(interaction, {
    content: message,
    flags: MessageFlags.Ephemeral,
  });
}

function getTrimmedStringOption(interaction, optionName) {
  const value = interaction.options.getString(optionName);

  return value === null ? null : value.trim();
}

function normalizeSearchText(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function truncateChoiceName(value) {
  return truncateText(value, 100);
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

module.exports = {
  canManageServer,
  deferStatsReply,
  getCharacterService,
  getStatisticsService,
  getTrimmedStringOption,
  normalizeSearchText,
  replyWithError,
  sendStatsResponse,
  shouldUsePrivateResponse,
  truncateChoiceName,
};
