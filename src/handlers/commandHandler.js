const path = require("path");
const { Collection } = require("discord.js");

const logger = require("../utils/logger");
const { getJavaScriptFiles } = require("../utils/fileLoader");

const commandsDirectory = path.join(__dirname, "..", "commands");
const modulesDirectory = path.join(__dirname, "..", "modules");

function getReadablePath(fullPath) {
  return path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
}

/**
 * Vérifie qu'un fichier de commande respecte le contrat minimal du projet.
 * Une commande invalide est ignorée pour ne pas bloquer tout le bot.
 */
function isCommandValid(command, filePath) {
  const errors = [];

  if (!command || typeof command !== "object") {
    errors.push("le fichier n'exporte pas un objet");
  } else {
    if (!command.data || typeof command.data.toJSON !== "function") {
      errors.push("data doit être un SlashCommandBuilder valide");
    } else {
      try {
        const commandData = command.data.toJSON();

        if (typeof commandData.name !== "string" || commandData.name.length === 0) {
          errors.push("data.name doit être une chaîne non vide");
        }

        if (typeof commandData.description !== "string" || commandData.description.length === 0) {
          errors.push("data.description doit être une chaîne non vide");
        }

        if (typeof command.name === "string" && command.name !== commandData.name) {
          errors.push("name doit correspondre au nom défini dans data");
        }
      } catch (error) {
        errors.push(`data.toJSON() a échoué : ${error.message}`);
      }
    }

    if (typeof command.name !== "string" || command.name.length === 0) {
      errors.push("name doit être une chaîne non vide");
    }

    if (typeof command.description !== "string" || command.description.length === 0) {
      errors.push("description doit être une chaîne non vide");
    }

    if (typeof command.category !== "string" || command.category.length === 0) {
      errors.push("category doit être une chaîne non vide");
    }

    if (typeof command.usage !== "string" || command.usage.length === 0) {
      errors.push("usage doit être une chaîne non vide");
    }

    if (typeof command.isEnabled !== "boolean") {
      errors.push("isEnabled doit être un booléen");
    }

    if (typeof command.isDeployed !== "boolean") {
      errors.push("isDeployed doit être un booléen");
    }

    if (typeof command.execute !== "function") {
      errors.push("execute doit être une fonction");
    }
  }

  if (errors.length > 0) {
    logger.warning(
      "COMMANDES",
      `Commande ignorée dans ${getReadablePath(filePath)} : ${errors.join(", ")}.`,
    );
    return false;
  }

  return true;
}

/**
 * Lit toutes les commandes présentes dans src/commands, peu importe leur catégorie.
 * Cette fonction sert à la fois au chargement en mémoire et au déploiement Slash Commands.
 */
function readCommandsFromFolders() {
  const commandFiles = getJavaScriptFiles(commandsDirectory);
  const commands = [];

  for (const filePath of commandFiles) {
    try {
      const command = require(filePath);

      if (!isCommandValid(command, filePath)) {
        continue;
      }

      commands.push({
        ...command,
        category: command.category || path.basename(path.dirname(filePath)),
        filePath,
      });
    } catch (error) {
      logger.error("COMMANDES", `Erreur lors du chargement de ${getReadablePath(filePath)}.`, error);
    }
  }

  return commands;
}

function clearRequireCache(filePath) {
  const resolvedPath = require.resolve(filePath);

  delete require.cache[resolvedPath];
}

function clearModuleCache() {
  for (const filePath of getJavaScriptFiles(modulesDirectory)) {
    try {
      const resolvedPath = require.resolve(filePath);

      if (require.cache[resolvedPath]) {
        delete require.cache[resolvedPath];
      }
    } catch {
      // Si un fichier n'est pas dans le cache, rien n'est Ã  nettoyer.
    }
  }
}

function loadCommandFromFile(filePath) {
  clearModuleCache();
  clearRequireCache(filePath);

  const command = require(filePath);

  if (!isCommandValid(command, filePath)) {
    throw new Error("Le fichier de commande ne respecte pas le contrat attendu.");
  }

  return {
    ...command,
    category: command.category || path.basename(path.dirname(filePath)),
    filePath,
  };
}

function reloadCommand(client, commandName) {
  const normalizedCommandName = commandName.trim().replace(/^\//, "").toLowerCase();
  const currentCommand = client.commands.get(normalizedCommandName);

  if (!currentCommand?.filePath) {
    throw new Error(`La commande /${normalizedCommandName} est introuvable en mÃ©moire.`);
  }

  const reloadedCommand = loadCommandFromFile(currentCommand.filePath);

  if (reloadedCommand.name !== normalizedCommandName && client.commands.has(reloadedCommand.name)) {
    throw new Error(`Impossible de recharger /${normalizedCommandName} : /${reloadedCommand.name} existe dÃ©jÃ .`);
  }

  client.commands.delete(normalizedCommandName);
  client.commands.set(reloadedCommand.name, reloadedCommand);

  logger.success("COMMANDES", `Commande /${reloadedCommand.name} rechargÃ©e sans redÃ©marrage.`);

  return reloadedCommand;
}

/**
 * Charge les commandes valides dans client.commands.
 * discord.js utilise Collection, une Map améliorée pratique pour retrouver une commande par son nom.
 */
function loadCommands(client) {
  client.commands = new Collection();

  const commands = readCommandsFromFolders();

  for (const command of commands) {
    const commandName = command.name;

    if (client.commands.has(commandName)) {
      logger.warning("COMMANDES", `La commande /${commandName} est déjà chargée, doublon ignoré.`);
      continue;
    }

    client.commands.set(commandName, command);
    logger.info("COMMANDES", `Commande /${commandName} chargée depuis la catégorie ${command.category}.`);
  }

  const commandCount = client.commands.size;
  const commandLabel = logger.formatCount(commandCount, "commande");
  const loadedLabel = logger.pluralize(commandCount, "chargée");

  logger.success("COMMANDES", `${commandLabel} ${loadedLabel}.`);
}

module.exports = {
  loadCommands,
  readCommandsFromFolders,
  reloadCommand,
};
