const {
  getCharacterService,
  getShopService,
  normalizeSearchText,
  truncateChoiceName,
  validateOwnedCharacter,
} = require("./shared");

async function handleItemAutocomplete(interaction) {
  if (!interaction.guildId) {
    await interaction.respond([]);
    return;
  }

  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === "character") {
    await respondWithCharacterChoices(interaction, focusedOption.value || "");
    return;
  }

  if (focusedOption.name !== "item") {
    await interaction.respond([]);
    return;
  }

  const subcommand = interaction.options.getSubcommand(false);

  if (["sell", "use"].includes(subcommand)) {
    await respondWithInventoryChoices(interaction, focusedOption.value || "");
    return;
  }

  await respondWithShopItemChoices(interaction, focusedOption.value || "");
}

async function respondWithCharacterChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
  const choices = characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return character.isActive !== false && !character.isDeleted && searchableText.includes(focusedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(character.name),
      value: character.id,
    }));

  await interaction.respond(choices);
}

async function respondWithShopItemChoices(interaction, value) {
  const focusedValue = normalizeSearchText(value);
  const items = await getShopService().listShopItems(interaction.guildId);
  const choices = items
    .filter((item) => normalizeSearchText(`${item.name} ${item.id}`).includes(focusedValue))
    .slice(0, 25)
    .map((item) => ({
      name: truncateChoiceName(item.name),
      value: item.id,
    }));

  await interaction.respond(choices);
}

async function respondWithInventoryChoices(interaction, value) {
  const characterId = interaction.options.getString("character");

  if (!characterId) {
    await interaction.respond([]);
    return;
  }

  const focusedValue = normalizeSearchText(value);
  const character = await getCharacterService().getCharacter(interaction.guildId, characterId);

  try {
    validateOwnedCharacter(character, interaction.user.id);
  } catch {
    await interaction.respond([]);
    return;
  }

  const inventory = await getShopService().listInventoryItems(interaction.guildId, characterId);
  const choices = inventory
    .filter((item) => normalizeSearchText(`${item.name} ${item.itemId}`).includes(focusedValue))
    .slice(0, 25)
    .map((item) => ({
      name: truncateChoiceName(`${item.name} x${item.quantity}`),
      value: item.itemId,
    }));

  await interaction.respond(choices);
}

module.exports = {
  handleItemAutocomplete,
};
