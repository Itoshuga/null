const { MessageFlags } = require("discord.js");

const { handleStatsAutocomplete } = require("../../modules/stats/autocomplete");
const { createStatsCommandBuilder } = require("../../modules/stats/builder");
const { handleStatsCommand } = require("../../modules/stats/handlers");
const {
  canManageServer,
  deferStatsReply,
  replyWithError,
  shouldUsePrivateResponse,
} = require("../../modules/stats/shared");

module.exports = {
  name: "stats",
  description: "Gère les statistiques roleplay du serveur.",
  category: "Roleplay",
  usage: "/stats <create|edit|delete|list|view>",
  data: createStatsCommandBuilder(),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "Cette commande doit être utilisée dans un serveur Discord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (["create", "edit", "delete"].includes(subcommand) && !canManageServer(interaction)) {
      await replyWithError(interaction, "Tu dois avoir la permission Gérer le serveur pour utiliser cette sous-commande.");
      return;
    }

    await deferStatsReply(interaction, shouldUsePrivateResponse(subcommand));
    await handleStatsCommand(interaction, subcommand);
  },

  async autocomplete(interaction) {
    await handleStatsAutocomplete(interaction);
  },
};
