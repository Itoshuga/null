const { MessageFlags } = require("discord.js");

const { handleItemAutocomplete } = require("../../modules/item/autocomplete");
const { createItemCommandBuilder } = require("../../modules/item/builder");
const { handleItemButton } = require("../../modules/item/buttons");
const { ITEM_COMPONENT_PREFIX } = require("../../modules/item/constants");
const {
  handleItemCommand,
  replyWithItemError,
} = require("../../modules/item/handlers");

module.exports = {
  name: "item",
  description: "Gère la boutique et l'inventaire roleplay.",
  category: "Roleplay",
  usage: "/item <shop|inventory|use|buy|sell|info>",
  componentPrefix: ITEM_COMPONENT_PREFIX,
  data: createItemCommandBuilder(),
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

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      await handleItemCommand(interaction, subcommand);
    } catch (error) {
      if (error.name === "ShopError") {
        await replyWithItemError(interaction, error.message);
        return;
      }

      throw error;
    }
  },

  async autocomplete(interaction) {
    await handleItemAutocomplete(interaction);
  },

  async handleButton(interaction) {
    await handleItemButton(interaction);
  },
};
