const { createRollCommandBuilder } = require("../../modules/roll/builder");
const { handleRollAutocomplete } = require("../../modules/roll/autocomplete");
const { handleRollCommand } = require("../../modules/roll/handlers");

module.exports = {
  name: "roll",
  description: "Lance des jets de dés roleplay.",
  category: "Roleplay",
  usage: "/roll <dice|stat|custom>",
  data: createRollCommandBuilder(),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply();
    await handleRollCommand(interaction, subcommand);
  },

  async autocomplete(interaction) {
    await handleRollAutocomplete(interaction);
  },
};
