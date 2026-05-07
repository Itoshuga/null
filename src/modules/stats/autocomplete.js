const {
  getStatisticsService,
  normalizeSearchText,
  truncateChoiceName,
} = require("./shared");

async function handleStatsAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedValue = normalizeSearchText(interaction.options.getFocused() || "");
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);
  const choices = statistics
    .filter((statistic) => {
      const searchableText = normalizeSearchText(`${statistic.name} ${statistic.id} ${statistic.category || ""}`);

      return searchableText.includes(focusedValue);
    })
    .slice(0, 25)
    .map((statistic) => ({
      name: truncateChoiceName(statistic.name),
      value: statistic.id,
    }));

  await interaction.respond(choices);
}

module.exports = {
  handleStatsAutocomplete,
};
