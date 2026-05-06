const {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const PURGE_EMBED_COLOR = 0xf2f4f8;

module.exports = {
  name: "purge",
  description: "Supprime plusieurs messages dans le salon actuel.",
  category: "Moderation",
  usage: "/purge amount:nombre [user]",
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Supprime plusieurs messages dans le salon actuel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Nombre de messages à supprimer.")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Utilisateur dont les messages doivent être supprimés.")
        .setRequired(false),
    ),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const amount = interaction.options.getInteger("amount", true);
    const targetUser = interaction.options.getUser("user");

    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Cette commande doit être utilisée dans un serveur Discord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: "Tu dois avoir la permission Gérer les messages pour utiliser cette commande.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const botMember = interaction.guild.members.me;

    if (!botMember?.permissionsIn(interaction.channel).has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: "Je n'ai pas la permission Gérer les messages dans ce salon.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const deletedMessages = targetUser
      ? await purgeUserMessages(interaction.channel, targetUser, amount)
      : await interaction.channel.bulkDelete(amount, true);

    await interaction.editReply({
      embeds: [createPurgeEmbed(deletedMessages.size, targetUser)],
    });
  },
};

async function purgeUserMessages(channel, user, amount) {
  const fetchedMessages = await channel.messages.fetch({
    limit: 100,
  });

  const messagesToDelete = fetchedMessages
    .filter((message) => message.author.id === user.id)
    .first(amount);

  if (messagesToDelete.length === 0) {
    return channel.bulkDelete([], true);
  }

  return channel.bulkDelete(messagesToDelete, true);
}

function createPurgeEmbed(deletedCount, targetUser) {
  return new EmbedBuilder()
    .setColor(PURGE_EMBED_COLOR)
    .setDescription(createPurgeDescription(deletedCount, targetUser));
}

function createPurgeDescription(deletedCount, targetUser) {
  const isSingular = deletedCount === 1;
  const messageLabel = isSingular ? "message" : "messages";
  const auxiliary = isSingular ? "a" : "ont";
  const deletedLabel = isSingular ? "supprimé" : "supprimés";
  const targetLabel = targetUser ? ` de **${targetUser.username}**` : "";

  return [
    "### \\🧹 **Salon nettoyé**",
    "",
    `**${deletedCount} ${messageLabel}**${targetLabel} ${auxiliary} été ${deletedLabel} avec succès.`,
  ].join("\n");
}
