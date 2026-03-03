const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    deploy: true,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Mesure la latence du flux."),
    async execute(interaction) {
        const latency = Math.max(0, Math.round(interaction.client.ws.ping ?? 0));
        const content = interaction.client.i18n?.t
            ? interaction.client.i18n.t(interaction, "ping.description", { latency })
            : `Latence : ${latency} ms.`;

        await interaction.reply({ content });
    },
};
