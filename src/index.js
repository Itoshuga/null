const { Client, GatewayIntentBits } = require("discord.js");

const botConfig = require("./config/botConfig");
const logger = require("./utils/logger");
const { loadCommands } = require("./handlers/commandHandler");
const { loadEvents } = require("./handlers/eventHandler");
const { deployCommands } = require("./handlers/deployHandler");

/**
 * Point d'entrée principal du bot.
 * On garde le démarrage dans une fonction async pour gérer proprement les erreurs.
 */
async function startBot() {
  try {
    botConfig.verifyConfig();

    // La connexion Firebase est lancée au démarrage afin de détecter rapidement une mauvaise configuration.
    require("./services/firebase");

    const client = new Client({
      intents: [
        // Cet intent suffit pour recevoir les interactions Slash Commands.
        GatewayIntentBits.Guilds,
      ],
    });

    loadCommands(client);
    loadEvents(client);

    // Les Slash Commands sont synchronisées automatiquement à chaque démarrage.
    await deployCommands();

    await client.login(botConfig.discord.token);
  } catch (error) {
    logger.error("BOT", "Le démarrage du bot a échoué.", error);
    process.exit(1);
  }
}

startBot();
