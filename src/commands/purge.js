const {
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");

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
            const content = interaction.client.i18n.t(interaction, "purge.unavailable");
            await interaction.editReply({ content });
            return;
        }

        const amount = interaction.options.getInteger("amount", true);
        const deletedMessages = await channel.bulkDelete(amount, true);
        const key = deletedMessages.size > 0 ? "purge.description" : "purge.empty";
        const content = interaction.client.i18n.t(interaction, key, { count: deletedMessages.size });
        await interaction.editReply({ content });
    },
};
