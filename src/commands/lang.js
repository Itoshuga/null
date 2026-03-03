const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { COSMIC_COLORS, createCosmicEmbed } = require("../utils/cosmic");

module.exports = {
    deploy: true,
    data: new SlashCommandBuilder()
        .setName("lang")
        .setDescription("Aligne la langue du flux.")
        .addStringOption((option) =>
            option
                .setName("language")
                .setDescription("La langue a imposer au flux.")
                .setRequired(true)
                .addChoices(
                    { name: "Francais", value: "fr_FR" },
                    { name: "English", value: "en_UK" },
                ),
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const language = interaction.options.getString("language", true);
        const appliedLanguage = interaction.client.i18n.setLanguage(interaction, language);
        const embed = createCosmicEmbed({
            title: interaction.client.i18n.t(interaction, "lang.title"),
            description: interaction.client.i18n.t(interaction, `lang.${appliedLanguage}`),
            accent: appliedLanguage === "en_UK" ? COSMIC_COLORS.STARLIGHT : COSMIC_COLORS.MIST,
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
