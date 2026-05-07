const { SlashCommandBuilder } = require("discord.js");

function createStatsCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Consulte les statistiques roleplay du serveur.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Liste les statistiques roleplay du serveur."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("Affiche le détail d'une statistique roleplay.")
        .addStringOption((option) => addStatisticOption(option, "Statistique à consulter.")),
    );
}

function addStatisticOption(option, description) {
  return option
    .setName("statistic")
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

module.exports = {
  createStatsCommandBuilder,
};
