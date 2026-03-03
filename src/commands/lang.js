const { MessageFlags, SlashCommandBuilder } = require("discord.js");

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
            .addChoices({ name: "Francais", value: "fr_FR" }, { name: "English", value: "en_UK" }, ),
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const language = interaction.options.getString("language", true);
        const appliedLanguage = interaction.client.i18n.setLanguage(interaction, language);
        const content = interaction.client.i18n.t(interaction, `lang.${appliedLanguage}`);
        await interaction.editReply({ content });
    },
};