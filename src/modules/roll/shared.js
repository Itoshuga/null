function getCharacterService() {
  return require("../../services/characterService");
}

function getStatisticsService() {
  return require("../../services/statisticsService");
}

async function replyWithError(interaction, message) {
  await interaction.editReply({
    content: message,
    embeds: [],
  });
}

function normalizeSearchText(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasCharacterStatistic(character, statisticId) {
  return Object.prototype.hasOwnProperty.call(character.statistics || {}, statisticId);
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

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

module.exports = {
  clamp,
  getCharacterService,
  getStatisticsService,
  hasCharacterStatistic,
  normalizeSearchText,
  replyWithError,
  truncateChoiceName,
};
