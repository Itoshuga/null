const {
  createEmptyStatsEmbed,
  createStatisticEmbed,
  createStatisticsListEmbed,
  formatStatisticTitle,
} = require("./embeds");
const {
  getStatisticsService,
  replyWithError,
  sendStatsResponse,
} = require("./shared");

async function handleStatsCommand(interaction, subcommand) {
  if (subcommand === "list") {
    await handleList(interaction);
    return;
  }

  if (subcommand === "view") {
    await handleView(interaction);
  }
}

async function handleList(interaction) {
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);

  if (statistics.length === 0) {
    await sendStatsResponse(interaction, {
      embeds: [createEmptyStatsEmbed()],
    });
    return;
  }

  await sendStatsResponse(interaction, {
    embeds: [createStatisticsListEmbed(statistics)],
  });
}

async function handleView(interaction) {
  const statisticInput = interaction.options.getString("statistic", true);
  const statistic = await getStatisticsService().findStatistic(interaction.guildId, statisticInput);

  if (!statistic) {
    await replyWithError(interaction, "Cette statistique est introuvable.");
    return;
  }

  await sendStatsResponse(interaction, {
    embeds: [createStatisticEmbed(statistic, formatStatisticTitle(statistic))],
  });
}

module.exports = {
  handleStatsCommand,
};
