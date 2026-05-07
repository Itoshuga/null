const { EmbedBuilder } = require("discord.js");

const {
  DEFAULT_STATISTIC_VALUES,
  STATS_COLORS,
} = require("./constants");

function createEmptyStatsEmbed() {
  return new EmbedBuilder()
    .setColor(STATS_COLORS.warning)
    .setTitle("📊 Statistiques roleplay du serveur")
    .setDescription("Aucune statistique roleplay n'est configurée sur ce serveur.");
}

function createStatisticsListEmbed(statistics) {
  const displayedStatistics = statistics.slice(0, 25);
  const description = [
    "### \\🧬 **Liste des statistiques**",
    "Retrouvez ci-dessous l’ensemble des statistiques pouvant être attribuées à vos personnages.",
    statistics.length > 25 ? "" : null,
    statistics.length > 25 ? `Affichage des 25 premières statistiques sur ${statistics.length}.` : null,
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(STATS_COLORS.dark)
    .setDescription(description)
    .addFields(displayedStatistics.map(createStatisticListField));
}

function createStatisticListField(statistic) {
  return {
    name: formatStatisticChoice(statistic),
    value: [
      `**ID** | *\`${statistic.id}\`*`,
      `**Catégorie** | ${statistic.category || DEFAULT_STATISTIC_VALUES.category}`,
      `**Statut** | **\`${formatStatisticStatus(statistic)}\`**`,
      `**Défaut** | ${statistic.defaultValue}`,
      `**Min/Max** | **\`${statistic.minValue}\`** / **\`${statistic.maxValue}\`**`,
    ].join("\n"),
    inline: true,
  };
}

function createSimpleStatsEmbed(description) {
  return new EmbedBuilder()
    .setColor(STATS_COLORS.neutral)
    .setDescription(description);
}

function createSuccessDescription(emoji, title, statistic, actionLabel) {
  return [
    `### \\${emoji} **${title}**`,
    `La statistique **${statistic.name}** (\`${statistic.id}\`) a été ${actionLabel} avec succès.`,
  ].join("\n");
}

function createStatisticEmbed(statistic, title) {
  const status = formatStatisticStatus(statistic);
  const description = [
    `### **\\${title}**`,
    "",
    statistic.description || "Aucune description.",
    "",
    `**ID** | *\`${statistic.id}\`*`,
    `**Catégorie** | ${statistic.category || DEFAULT_STATISTIC_VALUES.category}`,
    `**Statut** | **\`${status}\`**`,
    `**Défaut** | ${statistic.defaultValue}`,
    `**Min/Max** | **\`${statistic.minValue}\`** / **\`${statistic.maxValue}\`**`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor(STATS_COLORS.detail)
    .setDescription(description);
}

function formatStatisticTitle(statistic) {
  const emoji = statistic.emoji ? `${statistic.emoji} ` : "";

  return `${emoji}Statistique : ${statistic.name}`;
}

function formatStatisticChoice(statistic) {
  return statistic.emoji ? `\\${statistic.emoji} ${statistic.name}` : statistic.name;
}

function formatStatisticStatus(statistic) {
  return statistic.isActive === false ? "🔴 Inactive" : "🟢 Active";
}

module.exports = {
  createEmptyStatsEmbed,
  createSimpleStatsEmbed,
  createStatisticEmbed,
  createStatisticsListEmbed,
  createSuccessDescription,
  formatStatisticTitle,
};
