const { MessageFlags } = require("discord.js");

async function replyWithFallback(interaction, payload) {
    try {
        if (interaction.replied) {
            await interaction.followUp(payload);
            return;
        }

        if (interaction.deferred) {
            await interaction.editReply(payload);
            return;
        }

        await interaction.reply(payload);
    } catch (err) {
        if (err?.code === 10062 || err?.code === 40060) {
            return;
        }

        throw err;
    }
}

module.exports = {
    name: "interactionCreate",
    async execute(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        const ownerId = process.env.OWNER_ID;
        const isOwner = ownerId && interaction.user.id === ownerId;

        if (!isOwner && command.permissions?.length) {
            const hasPermissions = interaction.memberPermissions?.has(command.permissions);

            if (!hasPermissions) {
                const payload = {
                    content: client.i18n.t(interaction, "errors.permissionDenied"),
                    flags: MessageFlags.Ephemeral,
                };

                await replyWithFallback(interaction, payload);
                return;
            }
        }

        try {
            await command.execute(interaction);
        } catch (err) {
            console.error(err);
            const payload = {
                content: client.i18n.t(interaction, "errors.unexpected"),
                flags: MessageFlags.Ephemeral,
            };

            await replyWithFallback(interaction, payload);
        }
    },
};
