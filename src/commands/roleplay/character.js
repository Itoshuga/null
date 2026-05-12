const { MessageFlags } = require("discord.js");

const { handleCharacterAutocomplete } = require("../../modules/character/autocomplete");
const { createCharacterCommandBuilder } = require("../../modules/character/builder");
const { handleCharacterButton } = require("../../modules/character/buttons");
const { CHARACTER_COMPONENT_PREFIX } = require("../../modules/character/constants");
const {
  handleCharacterCommand,
  handleCharacterModalSubmit,
} = require("../../modules/character/handlers");
const {
  deferCharacterReply,
  shouldDeferCharacterCommand,
} = require("../../modules/character/shared");

module.exports = {
  name: "character",
  description: "Gère les personnages roleplay du serveur.",
  category: "Roleplay",
  usage: "/character <create|edit|delete|list|view>",
  componentPrefix: CHARACTER_COMPONENT_PREFIX,
  data: createCharacterCommandBuilder(),
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

    if (shouldDeferCharacterCommand(subcommand)) {
      await deferCharacterReply(interaction, false);
    }

    await handleCharacterCommand(interaction, subcommand);
  },

  async autocomplete(interaction) {
    await handleCharacterAutocomplete(interaction);
  },

  async handleModalSubmit(interaction) {
    await handleCharacterModalSubmit(interaction);
  },

  async handleButton(interaction) {
    await handleCharacterButton(interaction);
  },
};
