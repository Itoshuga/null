const {
  getCharacterService,
  normalizeSearchText,
  truncateChoiceName,
} = require("./shared");

async function handleEconomyAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === "to_character") {
    await autocompleteAllCharacters(interaction, focusedOption.value);
    return;
  }

  if (["character", "from_character"].includes(focusedOption.name)) {
    await autocompleteOwnedCharacters(interaction, focusedOption.value);
    return;
  }

  await interaction.respond([]);
}

async function autocompleteOwnedCharacters(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
  const choices = createCharacterChoices(characters, normalizedValue);

  await interaction.respond(choices);
}

async function autocompleteAllCharacters(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characters = await getCharacterService().listCharacters(interaction.guildId);
  const choices = createCharacterChoices(characters, normalizedValue);

  await interaction.respond(choices);
}

function createCharacterChoices(characters, normalizedValue) {
  return characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return character.isActive !== false && searchableText.includes(normalizedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(character.name),
      value: character.id,
    }));
}

module.exports = {
  handleEconomyAutocomplete,
};
