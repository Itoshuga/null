const { EmbedBuilder } = require("discord.js");

const CONFIG_COLOR = 0xc9ced8;
const MAX_ITEM_PRICE = 1_000_000_000;
const DEFAULT_STATISTIC_VALUES = {
  category: "Général",
  defaultValue: 10,
  emoji: "",
  isActive: true,
  maxValue: 100,
  minValue: 0,
  order: 0,
};

function getCharacterService() {
  return require("../../services/characterService");
}

function getEconomyService() {
  return require("../../services/economyService");
}

function getShopService() {
  return require("../../services/shopService");
}

function getStatisticsService() {
  return require("../../services/statisticsService");
}

function createSimpleEmbed(description) {
  return new EmbedBuilder()
    .setColor(CONFIG_COLOR)
    .setDescription(description);
}

async function replyWithEmbed(interaction, description) {
  await interaction.editReply({
    embeds: [createSimpleEmbed(description)],
  });
}

async function replyWithError(interaction, message) {
  await interaction.editReply({
    content: message,
    embeds: [],
  });
}

function formatCurrency(amount, settings) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${settings.currencySymbol}`;
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
  return value.length <= 100 ? value : `${value.slice(0, 97)}...`;
}

module.exports = {
  DEFAULT_STATISTIC_VALUES,
  MAX_ITEM_PRICE,
  formatCurrency,
  getCharacterService,
  getEconomyService,
  getShopService,
  getStatisticsService,
  getTrimmedStringOption,
  normalizeSearchText,
  replyWithEmbed,
  replyWithError,
  truncateChoiceName,
};
