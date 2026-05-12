const {
  getCharacterService,
  normalizeSearchText,
  truncateChoiceName,
} = require("./shared");

async function handleCharacterAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedValue = normalizeSearchText(interaction.options.getFocused() || "");
  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
  const choices = characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return searchableText.includes(focusedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(character.name),
      value: character.id,
    }));

  await interaction.respond(choices);
}

module.exports = {
  handleCharacterAutocomplete,
};
