const { Events } = require("discord.js");

const logger = require("../../utils/logger");

module.exports = {
  name: Events.ClientReady,
  once: true,

  /**
   * Evénement déclenché quand Discord confirme que le bot est connecté.
   */
  execute(client) {
    logger.success("BOT", `Connecté en tant que ${client.user.tag}.`);
  },
};
