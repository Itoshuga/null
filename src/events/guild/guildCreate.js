const { Events } = require("discord.js");

const logger = require("../../utils/logger");

module.exports = {
  name: Events.GuildCreate,
  once: false,

  /**
   * Evénement déclenché quand le bot rejoint un nouveau serveur Discord.
   */
  execute(guild) {
    logger.info("GUILD", `Le bot a rejoint le serveur ${guild.name} (${guild.id}).`);
  },
};
