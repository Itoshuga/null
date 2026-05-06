const { Events, PermissionFlagsBits } = require("discord.js");

const logger = require("../../utils/logger");

module.exports = {
  name: Events.MessageCreate,
  once: false,

  /**
   * Détecte les messages commençant par un proxy RP, puis les renvoie via webhook.
   * Exemple : "isen:bonjour" devient un message envoyé avec le nom et l'avatar d'Isen.
   */
  async execute(message, client) {
    if (!message.guild || message.author.bot || !message.content) {
      return;
    }

    const proxy = extractProxyCandidate(message.content);

    if (!proxy) {
      return;
    }

    const character = await getCharacterService().findCharacterByProxy(message.guild.id, proxy);

    if (!character || character.ownerId !== message.author.id) {
      return;
    }

    const proxiedContent = message.content.slice(character.proxy.length).trim();

    if (!proxiedContent) {
      return;
    }

    const botMember = message.guild.members.me;

    if (!botMember) {
      return;
    }

    const permissions = message.channel.permissionsFor(botMember);

    if (
      !permissions?.has(PermissionFlagsBits.ManageWebhooks) ||
      !permissions.has(PermissionFlagsBits.ManageMessages) ||
      !permissions.has(PermissionFlagsBits.SendMessages)
    ) {
      logger.warning("PROXY", `Permissions insuffisantes pour utiliser le proxy dans #${message.channel.name}.`);
      return;
    }

    try {
      const webhook = await getWebhookService().getOrCreateChannelWebhook(message.guild.id, message.channel, client);

      if (!webhook) {
        logger.warning("PROXY", `Aucun webhook ne peut être créé dans #${message.channel.name}.`);
        return;
      }

      await webhook.send({
        content: proxiedContent,
        username: character.name,
        avatarURL: character.avatarUrl,
        allowedMentions: {
          parse: [],
        },
      });

      await message.delete().catch(() => null);
    } catch (error) {
      logger.error("PROXY", "Erreur lors de l'envoi d'un message proxy.", error);
    }
  },
};

function getCharacterService() {
  return require("../../services/characterService");
}

function getWebhookService() {
  return require("../../services/webhookService");
}

function extractProxyCandidate(content) {
  const separatorIndex = content.indexOf(":");

  if (separatorIndex < 2) {
    return null;
  }

  return content.slice(0, separatorIndex + 1).trim().toLowerCase();
}
