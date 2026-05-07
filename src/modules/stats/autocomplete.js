const {
  getCharacterService,
  getStatisticsService,
  normalizeSearchText,
  truncateChoiceName,
} = require("./shared");

async function handleStatsAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === "character") {
    await respondWithCharacterChoices(interaction, focusedOption.value || "");
    return;
  }

  if (focusedOption.name === "statistic") {
    await respondWithStatisticChoices(interaction, focusedOption.value || "");
    return;
  }

  await interaction.respond([]);
}

async function respondWithCharacterChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const characters = await getCharacterService().listCharacters(interaction.guildId);
  const choices = characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return character.isActive !== false && searchableText.includes(focusedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(`${character.name} (${character.id})`),
      value: character.id,
    }));

  await interaction.respond(choices);
}

async function respondWithStatisticChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const subcommand = getSafeSubcommand(interaction);
  const characterId = interaction.options.getString("character");
  const character = characterId
    ? await getCharacterService().getCharacter(interaction.guildId, characterId)
    : null;
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);
  const choices = statistics
    .filter((statistic) => shouldShowStatisticChoice(statistic, character, subcommand))
    .filter((statistic) => {
      const searchableText = normalizeSearchText(`${statistic.name} ${statistic.id} ${statistic.category || ""}`);

      return searchableText.includes(focusedValue);
    })
    .slice(0, 25)
    .map((statistic) => ({
      name: truncateChoiceName(statistic.name),
      value: statistic.id,
    }));

  await interaction.respond(choices);
}

function shouldShowStatisticChoice(statistic, character, subcommand) {
  if (subcommand === "add") {
    return statistic.isActive !== false && (!character || hasCharacterStatistic(character, statistic.id));
  }

  if (subcommand === "remove") {
    return !character || hasCharacterStatistic(character, statistic.id);
  }

  return true;
}

function hasCharacterStatistic(character, statisticId) {
  return Object.prototype.hasOwnProperty.call(character.statistics || {}, statisticId);
}

function getSafeSubcommand(interaction) {
  try {
    return interaction.options.getSubcommand(false);
  } catch {
    return null;
  }
}

module.exports = {
  handleStatsAutocomplete,
};
