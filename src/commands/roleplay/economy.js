const { MessageFlags } = require("discord.js");

const { handleEconomyAutocomplete } = require("../../modules/economy/autocomplete");
const { createEconomyCommandBuilder } = require("../../modules/economy/builder");
const { handleEconomyButton } = require("../../modules/economy/buttons");
const { ECONOMY_COMPONENT_PREFIX } = require("../../modules/economy/constants");
const {
  getReplyOptions,
  handleEconomyCommand,
  replyWithEconomyError,
} = require("../../modules/economy/handlers");

module.exports = {
  name: "economy",
  description: "Gère l'économie roleplay des personnages.",
  category: "Roleplay",
  usage: "/economy <work|balance|deposit|withdraw|payment|transactions>",
  componentPrefix: ECONOMY_COMPONENT_PREFIX,
  data: createEconomyCommandBuilder(),
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

    try {
      const subcommand = interaction.options.getSubcommand();

      await interaction.deferReply(getReplyOptions(subcommand));
      await handleEconomyCommand(interaction, subcommand);
    } catch (error) {
      if (error.name === "EconomyError") {
        await replyWithEconomyError(interaction, error);
        return;
      }

      throw error;
    }
  },

  async autocomplete(interaction) {
    await handleEconomyAutocomplete(interaction);
  },

  async handleButton(interaction) {
    await handleEconomyButton(interaction);
  },
};
