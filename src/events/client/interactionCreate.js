const { Events, MessageFlags } = require("discord.js");

const logger = require("../../utils/logger");

async function replyPrivately(interaction, message) {
  const response = {
    content: message,
    flags: MessageFlags.Ephemeral,
  };

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  } catch (error) {
    if (error.code === 40060) {
      try {
        await interaction.followUp(response);
      } catch (followUpError) {
        logger.error("INTERACTIONS", "Impossible d'envoyer une réponse de secours.", followUpError);
      }
      return;
    }

    logger.error("INTERACTIONS", "Impossible d'envoyer une réponse privée.", error);
  }
}

async function handleSelectMenuInteraction(interaction, client) {
  const command = [...client.commands.values()].find((loadedCommand) => {
    return (
      typeof loadedCommand.componentPrefix === "string" &&
      typeof loadedCommand.handleSelectMenu === "function" &&
      interaction.customId.startsWith(loadedCommand.componentPrefix)
    );
  });

  if (!command) {
    logger.warning("INTERACTIONS", `Menu ${interaction.customId} reçu mais aucun handler n'est disponible.`);
    await replyPrivately(interaction, "Ce menu n'est plus disponible pour le moment.");
    return;
  }

  if (!command.isEnabled) {
    await replyPrivately(interaction, "Cette fonctionnalité est actuellement en maintenance.");
    return;
  }

  try {
    await command.handleSelectMenu(interaction, client);
  } catch (error) {
    logger.error("INTERACTIONS", `Erreur lors du traitement du menu ${interaction.customId}.`, error);
    await replyPrivately(interaction, "Une erreur est survenue lors du traitement de ce menu.");
  }
}

async function handleButtonInteraction(interaction, client) {
  const command = [...client.commands.values()].find((loadedCommand) => {
    return (
      typeof loadedCommand.componentPrefix === "string" &&
      typeof loadedCommand.handleButton === "function" &&
      interaction.customId.startsWith(loadedCommand.componentPrefix)
    );
  });

  if (!command) {
    logger.warning("INTERACTIONS", `Bouton ${interaction.customId} reçu mais aucun handler n'est disponible.`);
    await replyPrivately(interaction, "Ce bouton n'est plus disponible pour le moment.");
    return;
  }

  if (!command.isEnabled) {
    await replyPrivately(interaction, "Cette fonctionnalité est actuellement en maintenance.");
    return;
  }

  try {
    await command.handleButton(interaction, client);
  } catch (error) {
    logger.error("INTERACTIONS", `Erreur lors du traitement du bouton ${interaction.customId}.`, error);
    await replyPrivately(interaction, "Une erreur est survenue lors du traitement de ce bouton.");
  }
}

async function handleModalSubmitInteraction(interaction, client) {
  const command = [...client.commands.values()].find((loadedCommand) => {
    return (
      typeof loadedCommand.componentPrefix === "string" &&
      typeof loadedCommand.handleModalSubmit === "function" &&
      interaction.customId.startsWith(loadedCommand.componentPrefix)
    );
  });

  if (!command) {
    logger.warning("INTERACTIONS", `Formulaire ${interaction.customId} reçu mais aucun handler n'est disponible.`);
    await replyPrivately(interaction, "Ce formulaire n'est plus disponible pour le moment.");
    return;
  }

  if (!command.isEnabled) {
    await replyPrivately(interaction, "Cette fonctionnalité est actuellement en maintenance.");
    return;
  }

  try {
    await command.handleModalSubmit(interaction, client);
  } catch (error) {
    logger.error("INTERACTIONS", `Erreur lors du traitement du formulaire ${interaction.customId}.`, error);
    await replyPrivately(interaction, "Une erreur est survenue lors du traitement de ce formulaire.");
  }
}

async function handleAutocompleteInteraction(interaction, client) {
  const command = client.commands.get(interaction.commandName);

  if (!command || !command.isEnabled || typeof command.autocomplete !== "function") {
    await interaction.respond([]);
    return;
  }

  try {
    await command.autocomplete(interaction, client);
  } catch (error) {
    logger.error("INTERACTIONS", `Erreur lors de l'autocomplétion de /${interaction.commandName}.`, error);

    if (!interaction.responded) {
      await interaction.respond([]);
    }
  }
}

module.exports = {
  name: Events.InteractionCreate,
  once: false,

  /**
   * Evénement déclenché à chaque interaction Discord.
   * On traite les Slash Commands et les composants interactifs gérés par les commandes.
   */
  async execute(interaction, client) {
    if (interaction.isAutocomplete()) {
      await handleAutocompleteInteraction(interaction, client);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction, client);
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction, client);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmitInteraction(interaction, client);
      return;
    }

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
