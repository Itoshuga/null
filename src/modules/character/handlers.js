const { MessageFlags } = require("discord.js");

const {
  CHARACTER_CREATE_MODAL_PREFIX,
  CHARACTER_DELETE_MODAL_PREFIX,
  CHARACTER_EDIT_MODAL_PREFIX,
  DEFAULT_STATISTICS_VERSION,
  MAX_ACTIVE_CHARACTERS,
} = require("./constants");
const {
  createCharacterListPayload,
  createCharacterViewPayload,
  createEmptyCharactersListEmbed,
  createSimpleCharacterEmbed,
  createSuccessDescription,
} = require("./embeds");
const {
  getCreateValuesFromModal,
  getEditValuesFromModal,
  showCharacterCreateModal,
  showCharacterDeleteModal,
  showCharacterEditModal,
} = require("./modals");
const {
  canManageCharacter,
  canManageServer,
  createCharacterListContext,
  createCharacterViewContext,
  deferCharacterReply,
  deletePendingCharacterEdit,
  getActiveStatistics,
  getCharacterService,
  getEconomyService,
  getPendingCharacterEdit,
  replyWithError,
  sendCharacterResponse,
  setPendingCharacterEdit,
} = require("./shared");

async function handleCharacterCommand(interaction, subcommand) {
  if (subcommand === "create") {
    await handleCreate(interaction);
    return;
  }

  if (subcommand === "edit") {
    await handleEdit(interaction);
    return;
  }

  if (subcommand === "delete") {
    await handleDelete(interaction);
    return;
  }

  if (subcommand === "list") {
    await handleList(interaction);
    return;
  }

  if (subcommand === "view") {
    await handleView(interaction);
  }
}

async function handleCharacterModalSubmit(interaction) {
  if (interaction.customId.startsWith(CHARACTER_CREATE_MODAL_PREFIX)) {
    await handleCreateModalSubmit(interaction);
    return;
  }

  if (interaction.customId.startsWith(CHARACTER_DELETE_MODAL_PREFIX)) {
    await handleDeleteModalSubmit(interaction);
    return;
  }

  if (interaction.customId.startsWith(CHARACTER_EDIT_MODAL_PREFIX)) {
    await handleEditModalSubmit(interaction);
    return;
  }

  await replyWithError(interaction, "Ce formulaire n'est plus disponible pour le moment.");
}

async function handleCreate(interaction) {
  await showCharacterCreateModal(interaction);
}

async function handleCreateModalSubmit(interaction) {
  if (!interaction.guildId) {
    await replyWithError(interaction, "Cette commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const [, , userId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce formulaire ne t'appartient pas.");
    return;
  }

  await deferCharacterReply(interaction, true);

  const values = getCreateValuesFromModal(interaction);

  await createCharacterFromValues(interaction, values);
}

async function handleDeleteModalSubmit(interaction) {
  if (!interaction.guildId) {
    await replyWithError(interaction, "Cette commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const [, , userId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce formulaire ne t'appartient pas.");
    return;
  }

  await deferCharacterReply(interaction, true);

  const [characterId] = interaction.fields.getStringSelectValues("character");

  await deleteCharacterById(interaction, characterId);
}

async function handleEditModalSubmit(interaction) {
  if (!interaction.guildId) {
    await replyWithError(interaction, "Cette commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const [, , , userId, requestId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce formulaire ne t'appartient pas.");
    return;
  }

  const pendingEdit = getPendingCharacterEdit(requestId);

  if (!pendingEdit || pendingEdit.guildId !== interaction.guildId || pendingEdit.userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce formulaire a expiré. Relance `/character edit` pour modifier ton personnage.");
    return;
  }

  deletePendingCharacterEdit(requestId);

  await deferCharacterReply(interaction, true);

  const currentCharacter = await getCharacterService().getCharacter(interaction.guildId, pendingEdit.characterId);

  if (!currentCharacter) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, currentCharacter)) {
    await replyWithError(interaction, "Tu ne peux modifier que tes propres personnages.");
    return;
  }

  const values = getEditValuesFromModal(interaction, currentCharacter);

  await updateCharacterFromValues(interaction, currentCharacter, values);
}

async function createCharacterFromValues(interaction, values) {
  const characterService = getCharacterService();
  const validationErrors = validateCharacterValues(values, {
    requireAvatar: true,
  });

  if (validationErrors.length > 0) {
    await replyWithError(interaction, validationErrors.join("\n"));
    return;
  }

  const characterCount = await characterService.countActiveCharactersByOwner(interaction.guildId, interaction.user.id);

  if (characterCount >= MAX_ACTIVE_CHARACTERS) {
    await replyWithError(interaction, `Tu peux avoir au maximum ${MAX_ACTIVE_CHARACTERS} personnages actifs sur ce serveur.`);
    return;
  }

  const isProxyAvailable = await characterService.isProxyAvailable(interaction.guildId, values.proxy);

  if (!isProxyAvailable) {
    await replyWithError(interaction, "Ce proxy est déjà utilisé par un autre personnage sur ce serveur.");
    return;
  }

  const characterId = await createAvailableCharacterId(interaction.guildId, values.name);
  const activeStatistics = await getActiveStatistics(interaction.guildId);
  const economySettings = await getEconomyService().getEconomySettings(interaction.guildId);
  const now = new Date().toISOString();
  const characterData = {
    id: characterId,
    ownerId: interaction.user.id,
    name: values.name,
    avatarUrl: values.avatarUrl,
    description: values.description,
    proxy: values.proxy,
    statistics: createCharacterStatistics(activeStatistics),
    statisticsVersion: DEFAULT_STATISTICS_VERSION,
    economy: getEconomyService().createInitialEconomy(economySettings),
    isActive: true,
    isDeleted: false,
    createdBy: interaction.user.id,
    updatedBy: interaction.user.id,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await characterService.createCharacter(interaction.guildId, characterData);

  await sendCharacterResponse(interaction, {
    embeds: [createSimpleCharacterEmbed(createSuccessDescription("🎭", "Personnage créé", characterData, "créé", activeStatistics.length))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEdit(interaction) {
  const characterId = interaction.options.getString("character", true);
  const character = await getCharacterService().getCharacter(interaction.guildId, characterId);

  if (!character) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, character)) {
    await replyWithError(interaction, "Tu ne peux modifier que tes propres personnages.");
    return;
  }

  setPendingCharacterEdit(interaction.id, {
    characterId,
    createdAt: Date.now(),
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  await showCharacterEditModal(interaction, character, interaction.id);
}

async function updateCharacterFromValues(interaction, currentCharacter, values) {
  const characterService = getCharacterService();

  if (!values.hasChanges) {
    await replyWithError(interaction, "Aucune modification n'a été fournie.");
    return;
  }

  const validationErrors = validateCharacterValues(values);

  if (validationErrors.length > 0) {
    await replyWithError(interaction, validationErrors.join("\n"));
    return;
  }

  const isProxyAvailable = await characterService.isProxyAvailable(interaction.guildId, values.proxy, currentCharacter.id);

  if (!isProxyAvailable) {
    await replyWithError(interaction, "Ce proxy est déjà utilisé par un autre personnage sur ce serveur.");
    return;
  }

  const updatedAt = new Date().toISOString();
  const updatedCharacter = {
    ...currentCharacter,
    avatarUrl: values.avatarUrl,
    description: values.description,
    name: values.name,
    proxy: values.proxy,
    updatedAt,
    updatedBy: interaction.user.id,
  };

  await characterService.updateCharacter(interaction.guildId, currentCharacter.id, {
    avatarUrl: updatedCharacter.avatarUrl,
    description: updatedCharacter.description,
    name: updatedCharacter.name,
    proxy: updatedCharacter.proxy,
    updatedAt,
    updatedBy: interaction.user.id,
  });

  await sendCharacterResponse(interaction, {
    embeds: [createSimpleCharacterEmbed(createSuccessDescription("✏️", "Personnage modifié", updatedCharacter, "mis à jour"))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleDelete(interaction) {
  await showCharacterDeleteModal(interaction);
}

async function deleteCharacterById(interaction, characterId) {
  const characterService = getCharacterService();
  const character = await characterService.getCharacter(interaction.guildId, characterId);

  if (!character) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, character)) {
    await replyWithError(interaction, "Tu ne peux supprimer que tes propres personnages.");
    return;
  }

  await characterService.softDeleteCharacter(interaction.guildId, characterId, {
    deletedAt: new Date().toISOString(),
    deletedBy: interaction.user.id,
  });

  await sendCharacterResponse(interaction, {
    embeds: [createSimpleCharacterEmbed(createSuccessDescription("🗑️", "Personnage supprimé", character, "supprimé"))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleList(interaction) {
  const targetUser = interaction.options.getUser("user") || interaction.user;

  if (targetUser.id !== interaction.user.id && !canManageServer(interaction)) {
    await replyWithError(interaction, "Tu dois avoir la permission Gérer le serveur pour consulter les personnages d'un autre membre.");
    return;
  }

  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, targetUser.id);

  if (characters.length === 0) {
    await sendCharacterResponse(interaction, {
      embeds: [createEmptyCharactersListEmbed(targetUser.id)],
    });
    return;
  }

  const selectedCharacterId = characters[0].id;
  const contextId = createCharacterListContext(interaction, targetUser.id, selectedCharacterId);

  await sendCharacterResponse(interaction, createCharacterListPayload(characters, targetUser.id, contextId, selectedCharacterId));
}

async function handleView(interaction) {
  const characterId = interaction.options.getString("character", true);
  const character = await getCharacterService().getCharacter(interaction.guildId, characterId);

  if (!character) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, character)) {
    await replyWithError(interaction, "Tu ne peux afficher que tes propres personnages.");
    return;
  }

  const activeStatistics = await getActiveStatistics(interaction.guildId);
  const contextId = createCharacterViewContext(interaction, character);

  await sendCharacterResponse(interaction, createCharacterViewPayload(character, activeStatistics, contextId));
}

async function createAvailableCharacterId(guildId, name) {
  const characterService = getCharacterService();
  const baseCharacterId = characterService.createCharacterId(name);

  if (!baseCharacterId) {
    return `personnage-${Date.now().toString(36)}`;
  }

  const existingCharacter = await characterService.getCharacter(guildId, baseCharacterId, {
    includeDeleted: true,
  });

  if (!existingCharacter) {
    return baseCharacterId;
  }

  return `${baseCharacterId}-${Date.now().toString(36)}`;
}

function createCharacterStatistics(statistics) {
  return Object.fromEntries(
    statistics.map((statistic) => [statistic.id, statistic.defaultValue]),
  );
}

function validateCharacterValues(values, options = {}) {
  const errors = [];

  if (!values.name || values.name.trim().length === 0) {
    errors.push("Le nom du personnage ne doit pas être vide.");
  }

  if (!values.description || values.description.trim().length === 0) {
    errors.push("La description du personnage ne doit pas être vide.");
  }

  if (options.requireAvatar && !values.avatarUrl) {
    errors.push("Tu dois fournir un avatar avec l'option `avatar`.");
  }

  if (values.avatarUrl && !isValidHttpUrl(values.avatarUrl)) {
    errors.push("L'avatar doit être une URL valide ou une image envoyée en pièce jointe.");
  }

  if (values.avatarContentType && !values.avatarContentType.startsWith("image/")) {
    errors.push("L'avatar envoyé doit être une image.");
  }

  errors.push(...validateProxy(values.proxy));

  return errors;
}

function validateProxy(proxy) {
  const errors = [];

  if (!proxy.endsWith(":")) {
    errors.push("Le proxy doit se terminer par `:`.");
  }

  if (!/^[a-z0-9_-]{2,19}:$/.test(proxy)) {
    errors.push("Le proxy doit contenir entre 3 et 20 caractères, sans espace, avec uniquement lettres, chiffres, `_`, `-`, puis `:`.");
  }

  return errors;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

module.exports = {
  handleCharacterCommand,
  handleCharacterModalSubmit,
};
