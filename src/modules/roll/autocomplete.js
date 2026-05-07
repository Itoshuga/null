const {
  getCharacterService,
  getStatisticsService,
  hasCharacterStatistic,
  normalizeSearchText,
  truncateChoiceName,
} = require("./shared");

async function handleRollAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === "character") {
    await autocompleteCharacters(interaction, focusedOption.value);
    return;
  }

  if (focusedOption.name === "statistic") {
    await autocompleteStatistics(interaction, focusedOption.value);
    return;
  }

  await interaction.respond([]);
}

async function autocompleteCharacters(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
  const choices = characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return character.isActive !== false && searchableText.includes(normalizedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(character.name),
      value: character.id,
    }));

  await interaction.respond(choices);
}

async function autocompleteStatistics(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characterId = interaction.options.getString("character");
  const character = characterId
    ? await getCharacterService().getCharacter(interaction.guildId, characterId)
    : null;
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);
  const choices = statistics
    .filter((statistic) => {
      const searchableText = normalizeSearchText(`${statistic.name} ${statistic.id} ${statistic.category || ""}`);

      return statistic.isActive !== false
        && (!character || hasCharacterStatistic(character, statistic.id))
        && searchableText.includes(normalizedValue);
    })
    .slice(0, 25)
    .map((statistic) => ({
      name: truncateChoiceName(statistic.name),
      value: statistic.id,
    }));

  await interaction.respond(choices);
}

module.exports = {
  handleRollAutocomplete,
};
