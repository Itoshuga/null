const path = require("path");

require("dotenv").config({ quiet: true });

/**
 * Convertit une variable d'environnement textuelle en booléen.
 * Les valeurs acceptées pour true restent simples pour éviter les surprises.
 */
function readBooleanFromEnv(name, defaultValue = false) {
  const value = process.env[name];

  if (typeof value === "undefined" || value === "") {
    return defaultValue;
  }

  return ["true", "1", "yes", "oui"].includes(value.toLowerCase());
}

const botConfig = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    deployCommandsGlobal: readBooleanFromEnv("DEPLOY_COMMANDS_GLOBAL", false),
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    serviceAccountPath: path.resolve(
      process.cwd(),
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "firebase-service-account.json",
    ),
  },
};

/**
 * Vérifie les variables indispensables au démarrage du bot.
 * Comme les commandes sont déployées automatiquement, CLIENT_ID est toujours requis.
 */
botConfig.verifyConfig = function verifyConfig() {
  const missingVariables = [];

  if (!botConfig.discord.token) {
    missingVariables.push("DISCORD_TOKEN");
  }

  if (!botConfig.discord.clientId) {
    missingVariables.push("CLIENT_ID");
  }

  if (!botConfig.discord.deployCommandsGlobal && !botConfig.discord.guildId) {
    missingVariables.push("GUILD_ID");
  }

  if (missingVariables.length > 0) {
    throw new Error(`Variables d'environnement manquantes : ${missingVariables.join(", ")}`);
  }
};

module.exports = botConfig;
