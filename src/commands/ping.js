const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Répond Pong !"),
    async execute(interaction) {
        await interaction.reply(`🏓 Pong ! Latence: ${interaction.client.ws.ping}ms`);
    },
};