const { Events, MessageFlags } = require("discord.js");

const logger = require("../../utils/logger");

async function replyPrivately(interaction, message) {
  const response = {
    content: message,
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(response);
    return;
  }

  await interaction.reply(response);
}

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  /**
   * Evénement déclenché à chaque interaction Discord.
   * Ici, on ne traite que les Slash Commands.
   */
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warning("COMMANDES", `Commande /${interaction.commandName} reçue mais introuvable en mémoire.`);
      await replyPrivately(interaction, "Cette commande n'est pas disponible pour le moment.");
      return;
    }

    if (!command.isEnabled) {
      await replyPrivately(interaction, "Cette commande est actuellement en maintenance.");
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      logger.error("COMMANDES", `Erreur lors de l'exécution de /${interaction.commandName}.`, error);
      await replyPrivately(interaction, "Une erreur est survenue lors de l'exécution de cette commande.");
    }
  },
};
