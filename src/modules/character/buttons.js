const {
  CHARACTER_LIST_BUTTON_PREFIX,
  CHARACTER_LIST_DIRECTIONS,
  CHARACTER_VIEW_BUTTON_PREFIX,
} = require("./constants");
const {
  createCharacterListPayload,
  createCharacterViewPayload,
} = require("./embeds");
const {
  canManageCharacter,
  getActiveStatistics,
  getCharacterListContext,
  getCharacterService,
  getCharacterViewContext,
  replyWithError,
} = require("./shared");

async function handleCharacterButton(interaction) {
  if (interaction.customId.startsWith(CHARACTER_LIST_BUTTON_PREFIX)) {
    await handleCharacterListButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(CHARACTER_VIEW_BUTTON_PREFIX)) {
    await handleCharacterViewButton(interaction);
    return;
  }

  await replyWithError(interaction, "Ce bouton n'est plus disponible pour le moment.");
}

async function handleCharacterViewButton(interaction) {
  const { contextId, panel } = parseCharacterViewButtonId(interaction.customId);
  const context = getCharacterViewContext(contextId);

  if (!context || context.guildId !== interaction.guildId) {
    await replyWithError(interaction, "Cette fiche personnage n'est plus disponible.");
    return;
  }

  if (context.userId !== interaction.user.id) {
    await replyWithError(interaction, "Cette fiche personnage ne t'appartient pas.");
    return;
  }

  const character = await getCharacterService().getCharacter(interaction.guildId, context.characterId);

  if (!character) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, character)) {
    await replyWithError(interaction, "Tu ne peux afficher que tes propres personnages.");
    return;
  }

  const activeStatistics = await getActiveStatistics(interaction.guildId);

  await interaction.update(createCharacterViewPayload(character, activeStatistics, contextId, panel));
}

async function handleCharacterListButton(interaction) {
  const { contextId, direction } = parseCharacterListButtonId(interaction.customId);
  const context = getCharacterListContext(contextId);

  if (!context || context.guildId !== interaction.guildId) {
    await replyWithError(interaction, "Cette liste de personnages n'est plus disponible.");
    return;
  }

  if (context.userId !== interaction.user.id) {
    await replyWithError(interaction, "Cette liste de personnages ne t'appartient pas.");
    return;
  }

  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, context.targetUserId);

  if (characters.length === 0) {
    await replyWithError(interaction, "Aucun personnage actif n'est disponible.");
    return;
  }

  const currentIndex = Math.max(
    characters.findIndex((character) => character.id === context.selectedCharacterId),
    0,
  );
  const nextIndex = direction === CHARACTER_LIST_DIRECTIONS.next
    ? Math.min(currentIndex + 1, characters.length - 1)
    : Math.max(currentIndex - 1, 0);
  const selectedCharacter = characters[nextIndex];

  context.selectedCharacterId = selectedCharacter.id;

  await interaction.update(createCharacterListPayload(characters, context.targetUserId, contextId, selectedCharacter.id));
}

function parseCharacterViewButtonId(customId) {
  const [, , contextId, panel] = customId.split(":");

  return {
    contextId,
    panel,
  };
}

function parseCharacterListButtonId(customId) {
  const [, , , contextId, direction] = customId.split(":");

  return {
    contextId,
    direction,
  };
}

module.exports = {
  handleCharacterButton,
};
