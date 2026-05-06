const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "roll",
  description: "Lance un dé et affiche le résultat.",
  category: "Fun",
  usage: "/roll [faces]",
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Lance un dé et affiche le résultat.")
    .addIntegerOption((option) =>
      option
        .setName("faces")
        .setDescription("Nombre de faces du dé.")
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(1000),
    ),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const faces = interaction.options.getInteger("faces") ?? 6;
    const result = Math.floor(Math.random() * faces) + 1;

    await interaction.reply(`🎲 Tu as lancé un dé à ${faces} faces et obtenu **${result}**.`);
  },
};
