const {
  getCharacterService,
  getShopService,
  getStatisticsService,
  normalizeSearchText,
  truncateChoiceName,
} = require("./shared");

async function handleConfigAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === "item") {
    await respondWithItemChoices(interaction, focusedOption.value || "");
    return;
  }

  if (focusedOption.name === "statistic") {
    await respondWithStatisticChoices(interaction, focusedOption.value || "");
    return;
  }

  if (focusedOption.name === "character") {
    await respondWithCharacterChoices(interaction, focusedOption.value || "");
    return;
  }

  await interaction.respond([]);
}

async function respondWithItemChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const items = await getShopService().listShopItems(interaction.guildId, {
    includeDisabled: true,
  });
  const choices = items
    .filter((item) => normalizeSearchText(`${item.name} ${item.id} ${item.category || ""}`).includes(focusedValue))
    .slice(0, 25)
    .map((item) => ({
      name: truncateChoiceName(`${item.name} (${item.id})`),
      value: item.id,
    }));

  await interaction.respond(choices);
}

async function respondWithStatisticChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const group = getSafeSubcommandGroup(interaction);
  const subcommand = getSafeSubcommand(interaction);
  const characterId = interaction.options.getString("character");
  const character = characterId
    ? await getCharacterService().getCharacter(interaction.guildId, characterId)
    : null;
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);
  const choices = statistics
    .filter((statistic) => shouldShowStatisticChoice(statistic, character, group, subcommand))
    .filter((statistic) => normalizeSearchText(`${statistic.name} ${statistic.id} ${statistic.category || ""}`).includes(focusedValue))
    .slice(0, 25)
    .map((statistic) => ({
      name: truncateChoiceName(statistic.name),
      value: statistic.id,
    }));

  await interaction.respond(choices);
}

function shouldShowStatisticChoice(statistic, character, group, subcommand) {
  if (group === "stats" && ["add", "remove"].includes(subcommand)) {
    return statistic.isActive !== false && (!character || hasCharacterStatistic(character, statistic.id));
  }

  return true;
}

function hasCharacterStatistic(character, statisticId) {
  return Object.prototype.hasOwnProperty.call(character.statistics || {}, statisticId);
}

function getSafeSubcommandGroup(interaction) {
  try {
    return interaction.options.getSubcommandGroup(false);
  } catch {
    return null;
  }
}

function getSafeSubcommand(interaction) {
  try {
    return interaction.options.getSubcommand(false);
  } catch {
    return null;
  }
}

async function respondWithCharacterChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const characters = await getCharacterService().listCharacters(interaction.guildId);
  const choices = characters
    .filter((character) => normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`).includes(focusedValue))
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(`${character.name} (${character.id})`),
      value: character.id,
    }));

  await interaction.respond(choices);
}

module.exports = {
  handleConfigAutocomplete,
};
