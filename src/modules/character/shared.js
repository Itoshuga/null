const {
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");

const {
  CHARACTER_EDIT_MODAL_TTL_MS,
  CHARACTER_LIST_CONTEXT_TTL_MS,
  CHARACTER_VIEW_CONTEXT_TTL_MS,
} = require("./constants");

const pendingCharacterEdits = new Map();
const characterListContexts = new Map();
const characterViewContexts = new Map();

function getCharacterService() {
  return require("../../services/characterService");
}

function getStatisticsService() {
  return require("../../services/statisticsService");
}

function getEconomyService() {
  return require("../../services/economyService");
}

function canManageServer(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function canManageCharacter(interaction, character) {
  return character.ownerId === interaction.user.id || canManageServer(interaction);
}

function shouldDeferCharacterCommand(subcommand) {
  return ["list", "view"].includes(subcommand);
}

async function deferCharacterReply(interaction, isPrivateResponse) {
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

async function sendCharacterResponse(interaction, payload) {
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
  await sendCharacterResponse(interaction, {
    content: message,
    flags: MessageFlags.Ephemeral,
  });
}

async function getActiveStatistics(guildId) {
  const statistics = await getStatisticsService().listStatistics(guildId);

  return statistics.filter((statistic) => statistic.isActive !== false);
}

function setPendingCharacterEdit(requestId, pendingEdit) {
  cleanupExpiredCharacterEdits();

  pendingCharacterEdits.set(requestId, pendingEdit);
}

function getPendingCharacterEdit(requestId) {
  cleanupExpiredCharacterEdits();

  return pendingCharacterEdits.get(requestId) || null;
}

function deletePendingCharacterEdit(requestId) {
  pendingCharacterEdits.delete(requestId);
}

function cleanupExpiredCharacterEdits() {
  const now = Date.now();

  for (const [key, pendingEdit] of pendingCharacterEdits.entries()) {
    if (now - pendingEdit.createdAt > CHARACTER_EDIT_MODAL_TTL_MS) {
      pendingCharacterEdits.delete(key);
    }
  }
}

function createCharacterListContext(interaction, targetUserId, selectedCharacterId) {
  cleanupExpiredCharacterListContexts();

  characterListContexts.set(interaction.id, {
    createdAt: Date.now(),
    guildId: interaction.guildId,
    selectedCharacterId,
    targetUserId,
    userId: interaction.user.id,
  });

  return interaction.id;
}

function getCharacterListContext(contextId) {
  cleanupExpiredCharacterListContexts();

  return characterListContexts.get(contextId) || null;
}

function cleanupExpiredCharacterListContexts() {
  const now = Date.now();

  for (const [key, context] of characterListContexts.entries()) {
    if (now - context.createdAt > CHARACTER_LIST_CONTEXT_TTL_MS) {
      characterListContexts.delete(key);
    }
  }
}

function createCharacterViewContext(interaction, character) {
  cleanupExpiredCharacterViewContexts();

  characterViewContexts.set(interaction.id, {
    characterId: character.id,
    createdAt: Date.now(),
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  return interaction.id;
}

function getCharacterViewContext(contextId) {
  cleanupExpiredCharacterViewContexts();

  return characterViewContexts.get(contextId) || null;
}

function cleanupExpiredCharacterViewContexts() {
  const now = Date.now();

  for (const [key, context] of characterViewContexts.entries()) {
    if (now - context.createdAt > CHARACTER_VIEW_CONTEXT_TTL_MS) {
      characterViewContexts.delete(key);
    }
  }
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}

function formatCurrency(amount, settings = {}) {
  const currencySymbol = settings.currencySymbol || "¥";

  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${currencySymbol}`;
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
  canManageCharacter,
  canManageServer,
  createCharacterListContext,
  createCharacterViewContext,
  deferCharacterReply,
  deletePendingCharacterEdit,
  formatCount,
  formatCurrency,
  getActiveStatistics,
  getCharacterListContext,
  getCharacterService,
  getCharacterViewContext,
  getEconomyService,
  getPendingCharacterEdit,
  getStatisticsService,
  normalizeSearchText,
  replyWithError,
  sendCharacterResponse,
  setPendingCharacterEdit,
  shouldDeferCharacterCommand,
  truncateChoiceName,
  truncateText,
};
