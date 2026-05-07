const { MessageFlags, PermissionFlagsBits } = require("discord.js");

const { createConfigCommandBuilder } = require("../../modules/config/builder");
const { handleConfigAutocomplete } = require("../../modules/config/autocomplete");
const { handleItemConfig } = require("../../modules/config/items");
const { handleMoneyConfig } = require("../../modules/config/money");
const { handleStatsConfig } = require("../../modules/config/statistics");
const { replyWithError } = require("../../modules/config/shared");

module.exports = {
  name: "config",
  description: "Configure les systèmes roleplay du serveur.",
  category: "Administration",
  usage: "/config <item|stats|money> <action>",
  data: createConfigCommandBuilder(),
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: "Tu dois avoir la permission Gérer le serveur pour utiliser cette commande.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const group = interaction.options.getSubcommandGroup();
      const subcommand = interaction.options.getSubcommand();

      if (group === "item") {
        await handleItemConfig(interaction, subcommand);
        return;
      }

      if (group === "stats") {
        await handleStatsConfig(interaction, subcommand);
        return;
      }

      if (group === "money") {
        await handleMoneyConfig(interaction, subcommand);
      }
    } catch (error) {
      if (["EconomyError", "ShopError"].includes(error.name)) {
        await replyWithError(interaction, error.message);
        return;
      }

      throw error;
    }
  },

  async autocomplete(interaction) {
    await handleConfigAutocomplete(interaction);
  },
};
