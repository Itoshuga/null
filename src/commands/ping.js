const { SlashCommandBuilder } = require("discord.js");
const { COSMIC_COLORS, createCosmicEmbed } = require("../utils/cosmic");

module.exports = {
    deploy: true,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Mesure la latence du flux."),
    async execute(interaction) {
        const latency = interaction.client.ws.ping;
        const embed = createCosmicEmbed({
            title: interaction.client.i18n.t(interaction, "ping.title"),
            description: interaction.client.i18n.t(interaction, "ping.description", { latency }),
            accent: COSMIC_COLORS.STARLIGHT,
        });

        await interaction.reply({ embeds: [embed] });
    },
};
