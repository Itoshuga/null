const { REST, Routes } = require("discord.js");

const botConfig = require("../config/botConfig");
const logger = require("../utils/logger");
const { readCommandsFromFolders } = require("./commandHandler");

/**
 * Transforme une commande interne du projet en format attendu par l'API Discord.
 * SlashCommandBuilder fournit directement le JSON officiel attendu par Discord.
 */
function createDiscordPayload(command) {
  return command.data.toJSON();
}

/**
 * Déploie uniquement les commandes dont isDeployed vaut true.
 * Les commandes non déployées restent dans le projet, mais ne sont pas envoyées à Discord.
 */
async function deployCommands() {
  botConfig.verifyConfig();

  const commands = readCommandsFromFolders();
  const deployableCommands = [];

  for (const command of commands) {
    const commandPayload = createDiscordPayload(command);

    if (!command.isDeployed) {
      logger.info(
        "DEPLOIEMENT",
        `Commande /${commandPayload.name} ignorée car isDeployed est défini sur false.`,
      );
      continue;
    }

    deployableCommands.push(commandPayload);
    logger.info("DEPLOIEMENT", `Commande /${commandPayload.name} prête à être déployée.`);
  }

  const rest = new REST({ version: "10" }).setToken(botConfig.discord.token);
  const route = botConfig.discord.deployCommandsGlobal
    ? Routes.applicationCommands(botConfig.discord.clientId)
    : Routes.applicationGuildCommands(botConfig.discord.clientId, botConfig.discord.guildId);

  const deploymentScope = botConfig.discord.deployCommandsGlobal
    ? "globalement"
    : `sur le serveur ${botConfig.discord.guildId}`;

  const deployableCommandLabel = logger.formatCount(deployableCommands.length, "commande");

  logger.info("DEPLOIEMENT", `Synchronisation de ${deployableCommandLabel} ${deploymentScope}.`);

  const syncedCommands = await rest.put(route, {
    body: deployableCommands,
  });

  const syncedCommandLabel = logger.formatCount(syncedCommands.length, "commande");
  const syncedLabel = logger.pluralize(syncedCommands.length, "synchronisée");

  logger.success("DEPLOIEMENT", `${syncedCommandLabel} Slash ${syncedLabel}.`);
}

module.exports = {
  deployCommands,
};
