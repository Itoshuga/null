const {
  getCharacterService,
  getStatisticsService,
  hasCharacterStatistic,
} = require("./shared");

const STATISTIC_GAIN_CHANCE = 1 / 5;

async function tryImproveRandomStatistic(guildId, character, userId) {
  if (!shouldImproveStatistic()) {
    return null;
  }

  const eligibleStatistics = await getEligibleStatistics(guildId, character);

  if (eligibleStatistics.length === 0) {
    return null;
  }

  const statistic = pickRandomItem(eligibleStatistics);
  const previousValue = character.statistics[statistic.id];
  const newValue = previousValue + 1;

  await getCharacterService().setCharacterStatistic(
    guildId,
    character.id,
    statistic.id,
    newValue,
    userId,
  );

  return {
    newValue,
    previousValue,
    statistic,
  };
}

async function getEligibleStatistics(guildId, character) {
  const statistics = await getStatisticsService().listStatistics(guildId);

  return statistics.filter((statistic) => {
    if (statistic.isActive === false || !hasCharacterStatistic(character, statistic.id)) {
      return false;
    }

    const currentValue = character.statistics[statistic.id];

    return currentValue < statistic.maxValue;
  });
}

function shouldImproveStatistic() {
  return Math.random() < STATISTIC_GAIN_CHANCE;
}

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

module.exports = {
  tryImproveRandomStatistic,
};
