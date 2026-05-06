const path = require("path");

const logger = require("../utils/logger");
const { getJavaScriptFiles } = require("../utils/fileLoader");

const eventsDirectory = path.join(__dirname, "..", "events");

function getReadablePath(fullPath) {
  return path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
}

/**
 * Charge automatiquement tous les événements présents dans src/events.
 * once signifie que l'événement ne doit être exécuté qu'une seule fois.
 */
function loadEvents(client) {
  const eventFiles = getJavaScriptFiles(eventsDirectory);
  let eventCount = 0;

  for (const filePath of eventFiles) {
    try {
      const event = require(filePath);

      if (!event.name || typeof event.execute !== "function") {
        logger.warning("EVENEMENTS", `Evénement ignoré dans ${getReadablePath(filePath)} : structure invalide.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      eventCount += 1;
      logger.info("EVENEMENTS", `Evénement ${event.name} chargé.`);
    } catch (error) {
      logger.error("EVENEMENTS", `Erreur lors du chargement de ${getReadablePath(filePath)}.`, error);
    }
  }

  const eventLabel = logger.formatCount(eventCount, "événement");
  const loadedLabel = logger.pluralize(eventCount, "chargé");

  logger.success("EVENEMENTS", `${eventLabel} ${loadedLabel}.`);
}

module.exports = {
  loadEvents,
};
