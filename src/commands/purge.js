const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");
const { COSMIC_COLORS, createCosmicEmbed } = require("../utils/cosmic");

module.exports = {
    deploy: true,
    permissions: [PermissionFlagsBits.ManageMessages],
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Dissipe les traces recentes.")
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("Le nombre d'impulsions a dissiper.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.channel;
        const allowedTypes = [
            ChannelType.GuildText,
            ChannelType.PublicThread,
            ChannelType.PrivateThread,
            ChannelType.AnnouncementThread,
        ];

        if (!channel || !allowedTypes.includes(channel.type) || typeof channel.bulkDelete !== "function") {
            const embed = createCosmicEmbed({
                title: interaction.client.i18n.t(interaction, "purge.title"),
                description: interaction.client.i18n.t(interaction, "purge.unavailable"),
                accent: COSMIC_COLORS.MIST,
            });

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const amount = interaction.options.getInteger("amount", true);
        const deletedMessages = await channel.bulkDelete(amount, true);
        const key = deletedMessages.size > 0 ? "purge.description" : "purge.empty";
        const embed = createCosmicEmbed({
            title: interaction.client.i18n.t(interaction, "purge.title"),
            description: interaction.client.i18n.t(interaction, key, { count: deletedMessages.size }),
            accent: COSMIC_COLORS.STARLIGHT,
        });

        await interaction.editReply({ embeds: [embed] });
    },
};
