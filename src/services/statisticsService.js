function getDb() {
  return require("./firebase").db;
}

/**
 * Retourne la collection Firestore des statistiques RP d'un serveur.
 * Chemin final : /guilds/{GUILD_ID}/statistics/{STAT_ID}
 */
function getStatisticsCollection(guildId) {
  return getDb().collection("guilds").doc(guildId).collection("statistics");
}

/**
 * Génère un identifiant stable et lisible à partir du nom d'une statistique.
 * Exemple : "Force Physique" devient "force-physique".
 */
function createStatisticId(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getStatistic(guildId, statisticId, options = {}) {
  const snapshot = await getStatisticsCollection(guildId).doc(statisticId).get();

  if (!snapshot.exists) {
    return null;
  }

  const statistic = snapshot.data();

  if (!options.includeDeleted && statistic.isDeleted) {
    return null;
  }

  return statistic;
}

async function listStatistics(guildId) {
  const snapshot = await getStatisticsCollection(guildId).get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((statistic) => !statistic.isDeleted)
    .sort((firstStatistic, secondStatistic) => {
      const firstOrder = firstStatistic.order ?? 0;
      const secondOrder = secondStatistic.order ?? 0;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return firstStatistic.name.localeCompare(secondStatistic.name, "fr");
    });
}

async function createStatistic(guildId, statisticData) {
  await getStatisticsCollection(guildId).doc(statisticData.id).set(statisticData);
}

async function updateStatistic(guildId, statisticId, updatedData) {
  await getStatisticsCollection(guildId).doc(statisticId).update(updatedData);
}

async function softDeleteStatistic(guildId, statisticId, deletionData) {
  await getStatisticsCollection(guildId).doc(statisticId).update({
    isActive: false,
    isDeleted: true,
    deletedAt: deletionData.deletedAt,
    deletedBy: deletionData.deletedBy,
    updatedAt: deletionData.deletedAt,
    updatedBy: deletionData.deletedBy,
  });
}

module.exports = {
  createStatistic,
  createStatisticId,
  getStatistic,
  listStatistics,
  softDeleteStatistic,
  updateStatistic,
};
