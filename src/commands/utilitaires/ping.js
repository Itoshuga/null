const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Permet de vérifier si le bot répond correctement."),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;

    await interaction.reply(`Pong ! Latence actuelle : ${latency} ms.`);
  },
};
