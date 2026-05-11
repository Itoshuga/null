const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const CHARACTER_COLORS = {
  neutral: 0xf2f4f8,
  detail: 0xc9ced8,
  warning: 0x8d94a0,
};

const MAX_ACTIVE_CHARACTERS = 3;
const DEFAULT_STATISTICS_VERSION = 1;
const CHARACTER_COMPONENT_PREFIX = "character";
const CHARACTER_CREATE_MODAL_PREFIX = `${CHARACTER_COMPONENT_PREFIX}:create`;
const CHARACTER_DELETE_MODAL_PREFIX = `${CHARACTER_COMPONENT_PREFIX}:delete`;
const CHARACTER_EDIT_SELECT_PREFIX = `${CHARACTER_COMPONENT_PREFIX}:edit:select`;
const CHARACTER_EDIT_MODAL_PREFIX = `${CHARACTER_COMPONENT_PREFIX}:edit:modal`;
const CHARACTER_EDIT_MODAL_TTL_MS = 15 * 60 * 1000;
const CHARACTER_VIEW_BUTTON_PREFIX = `${CHARACTER_COMPONENT_PREFIX}:view`;
const CHARACTER_VIEW_CONTEXT_TTL_MS = 60 * 60 * 1000;
const CHARACTER_VIEW_PANELS = {
  economy: "economy",
  information: "information",
  profile: "profile",
  statistics: "statistics",
};
const pendingCharacterEdits = new Map();
const characterViewContexts = new Map();

module.exports = {
  name: "character",
  description: "Gère les personnages roleplay du serveur.",
  category: "Roleplay",
  usage: "/character <create|edit|delete|list|view>",
  data: new SlashCommandBuilder()
    .setName("character")
    .setDescription("Gère les personnages roleplay du serveur.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Crée un personnage roleplay avec un formulaire."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Modifie un personnage roleplay avec un formulaire.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à modifier.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Supprime doucement un personnage roleplay avec un formulaire."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Liste les personnages roleplay.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Utilisateur dont tu veux voir les personnages.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("Affiche la fiche d'un personnage roleplay.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à afficher.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),
  componentPrefix: CHARACTER_COMPONENT_PREFIX,
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    if (!interaction.guildId) {
      await replyWithError(interaction, "Cette commande doit être utilisée dans un serveur Discord.");
      return;
    }

    const subcommand = interaction.options.getSubcommand();

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

    await deferCharacterReply(interaction, shouldUsePrivateResponse(subcommand));

    if (subcommand === "list") {
      await handleList(interaction);
      return;
    }

    if (subcommand === "view") {
      await handleView(interaction);
    }
  },

  async autocomplete(interaction) {
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
  },

  async handleModalSubmit(interaction) {
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
  },

  async handleSelectMenu(interaction) {
    if (interaction.customId.startsWith(CHARACTER_EDIT_SELECT_PREFIX)) {
      await handleEditSelectMenu(interaction);
      return;
    }

    await replyWithError(interaction, "Ce menu n'est plus disponible pour le moment.");
  },

  async handleButton(interaction) {
    if (interaction.customId.startsWith(CHARACTER_VIEW_BUTTON_PREFIX)) {
      await handleCharacterViewButton(interaction);
      return;
    }

    await replyWithError(interaction, "Ce bouton n'est plus disponible pour le moment.");
  },
};

function getCharacterService() {
  return require("../../services/characterService");
}

function getStatisticsService() {
  return require("../../services/statisticsService");
}

function getEconomyService() {
  return require("../../services/economyService");
}

function canManageServer(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function shouldUsePrivateResponse(subcommand) {
  return ["create", "edit", "delete"].includes(subcommand);
}

async function deferCharacterReply(interaction, isPrivateResponse) {
  if (interaction.deferred || interaction.replied) {
    return;
  }

  try {
    await interaction.deferReply(isPrivateResponse ? { flags: MessageFlags.Ephemeral } : {});
  } catch (error) {
    if (error.code !== 40060) {
      throw error;
    }
  }
}

async function sendCharacterResponse(interaction, payload) {
  try {
    if (interaction.deferred) {
      await interaction.editReply(removeReplyOnlyOptions(payload));
      return;
    }

    if (interaction.replied) {
      await interaction.followUp(payload);
      return;
    }

    await interaction.reply(payload);
  } catch (error) {
    if (error.code === 40060) {
      await interaction.followUp(payload);
      return;
    }

    throw error;
  }
}

function removeReplyOnlyOptions(payload) {
  const { flags, ...editablePayload } = payload;

  return editablePayload;
}

async function showCharacterCreateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId(`${CHARACTER_CREATE_MODAL_PREFIX}:${interaction.user.id}`)
    .setTitle("Création de personnage")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Nom du personnage")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80),
        ),
      new LabelBuilder()
        .setLabel("Description roleplay")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1500),
        ),
      new LabelBuilder()
        .setLabel("Proxy du personnage")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("proxy")
            .setPlaceholder("Exemple : isen:")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(20),
        ),
      new LabelBuilder()
        .setLabel("Avatar du personnage")
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId("avatar")
            .setMinValues(1)
            .setMaxValues(1)
            .setRequired(true),
        ),
    );

  await interaction.showModal(modal);
}

async function showCharacterDeleteModal(interaction) {
  const characters = await getDeletableCharacters(interaction);

  if (characters.length === 0) {
    await replyWithError(interaction, "Aucun personnage actif ne peut être supprimé.");
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`${CHARACTER_DELETE_MODAL_PREFIX}:${interaction.user.id}`)
    .setTitle("Suppression de personnage")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Personnage à supprimer")
        .setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId("character")
            .setPlaceholder("Choisis le personnage à supprimer")
            .setMinValues(1)
            .setMaxValues(1)
            .setOptions(characters.slice(0, 25).map(createCharacterSelectOption)),
        ),
    );

  await interaction.showModal(modal);
}

async function showCharacterEditSelectMessage(interaction) {
  const characters = await getEditableCharacters(interaction);

  if (characters.length === 0) {
    await replyWithError(interaction, "Aucun personnage actif ne peut être modifié.");
    return;
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${CHARACTER_EDIT_SELECT_PREFIX}:${interaction.user.id}`)
    .setPlaceholder("Choisis le personnage à modifier")
    .setMinValues(1)
    .setMaxValues(1)
    .setOptions(characters.slice(0, 25).map(createCharacterSelectOption));

  await sendCharacterResponse(interaction, {
    content: "Choisis le personnage que tu veux modifier.",
    components: [
      new ActionRowBuilder().addComponents(selectMenu),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function showCharacterEditModal(interaction, character, requestId) {
  const modal = new ModalBuilder()
    .setCustomId(`${CHARACTER_EDIT_MODAL_PREFIX}:${interaction.user.id}:${requestId}`)
    .setTitle("Modification de personnage")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Nom du personnage")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("name")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(80)
            .setValue(truncateText(character.name, 80)),
        ),
      new LabelBuilder()
        .setLabel("Description roleplay")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1500)
            .setValue(truncateText(character.description || "", 1500)),
        ),
      new LabelBuilder()
        .setLabel("Proxy du personnage")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("proxy")
            .setPlaceholder("Exemple : isen:")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(20)
            .setValue(truncateText(character.proxy, 20)),
        ),
      new LabelBuilder()
        .setLabel("Nouvel avatar")
        .setFileUploadComponent(
          new FileUploadBuilder()
            .setCustomId("avatar")
            .setMinValues(0)
            .setMaxValues(1)
            .setRequired(false),
        ),
    );

  await interaction.showModal(modal);
}

function getCreateValuesFromModal(interaction) {
  const avatar = getAvatarUpload(interaction);

  return {
    avatarContentType: avatar?.contentType || null,
    avatarUrl: avatar?.url || null,
    description: interaction.fields.getTextInputValue("description").trim(),
    name: interaction.fields.getTextInputValue("name").trim(),
    proxy: getCharacterService().normalizeProxy(interaction.fields.getTextInputValue("proxy")),
  };
}

async function getDeletableCharacters(interaction) {
  if (canManageServer(interaction)) {
    return getCharacterService().listCharacters(interaction.guildId);
  }

  return getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
}

async function getEditableCharacters(interaction) {
  return getDeletableCharacters(interaction);
}

function createCharacterSelectOption(character) {
  return {
    label: truncateText(character.name, 100),
    value: character.id,
  };
}

function getEditValuesFromModal(interaction, currentCharacter) {
  const avatar = getOptionalAvatarUpload(interaction);
  const avatarUrl = avatar?.url || currentCharacter.avatarUrl;
  const description = interaction.fields.getTextInputValue("description").trim();
  const name = interaction.fields.getTextInputValue("name").trim();
  const proxy = getCharacterService().normalizeProxy(interaction.fields.getTextInputValue("proxy"));

  return {
    avatarContentType: avatar?.contentType || null,
    avatarUrl,
    description,
    hasChanges:
      avatarUrl !== currentCharacter.avatarUrl ||
      description !== currentCharacter.description ||
      name !== currentCharacter.name ||
      proxy !== currentCharacter.proxy,
    name,
    proxy,
  };
}

function getAvatarUpload(interaction) {
  const uploadedFiles = interaction.fields.getUploadedFiles("avatar", true);

  return uploadedFiles.first() || null;
}

function getOptionalAvatarUpload(interaction) {
  const uploadedFiles = interaction.fields.getUploadedFiles("avatar", false);

  return uploadedFiles?.first() || null;
}

function cleanupExpiredCharacterEdits() {
  const now = Date.now();

  for (const [key, pendingEdit] of pendingCharacterEdits.entries()) {
    if (now - pendingEdit.createdAt > CHARACTER_EDIT_MODAL_TTL_MS) {
      pendingCharacterEdits.delete(key);
    }
  }
}

function createCharacterViewContext(interaction, character) {
  cleanupExpiredCharacterViewContexts();

  characterViewContexts.set(interaction.id, {
    characterId: character.id,
    createdAt: Date.now(),
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  return interaction.id;
}

function getCharacterViewContext(contextId) {
  cleanupExpiredCharacterViewContexts();

  return characterViewContexts.get(contextId) || null;
}

function cleanupExpiredCharacterViewContexts() {
  const now = Date.now();

  for (const [key, context] of characterViewContexts.entries()) {
    if (now - context.createdAt > CHARACTER_VIEW_CONTEXT_TTL_MS) {
      characterViewContexts.delete(key);
    }
  }
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

async function handleEditSelectMenu(interaction) {
  cleanupExpiredCharacterEdits();

  const [, , , userId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce menu ne t'appartient pas.");
    return;
  }

  const [characterId] = interaction.values;
  const character = await getCharacterService().getCharacter(interaction.guildId, characterId);

  if (!character) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, character)) {
    await replyWithError(interaction, "Tu ne peux modifier que tes propres personnages.");
    return;
  }

  pendingCharacterEdits.set(interaction.id, {
    characterId,
    createdAt: Date.now(),
    guildId: interaction.guildId,
    userId: interaction.user.id,
  });

  await showCharacterEditModal(interaction, character, interaction.id);
}

async function handleEditModalSubmit(interaction) {
  cleanupExpiredCharacterEdits();

  if (!interaction.guildId) {
    await replyWithError(interaction, "Cette commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const [, , , userId, requestId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce formulaire ne t'appartient pas.");
    return;
  }

  const pendingEdit = pendingCharacterEdits.get(requestId);

  if (!pendingEdit || pendingEdit.guildId !== interaction.guildId || pendingEdit.userId !== interaction.user.id) {
    await replyWithError(interaction, "Ce formulaire a expiré. Relance `/character edit` pour modifier ton personnage.");
    return;
  }

  pendingCharacterEdits.delete(requestId);

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

function parseCharacterViewButtonId(customId) {
  const [, , contextId, panel] = customId.split(":");

  return {
    contextId,
    panel,
  };
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
  cleanupExpiredCharacterEdits();

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

  pendingCharacterEdits.set(interaction.id, {
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

  await sendCharacterResponse(interaction, {
    embeds: [createCharactersListEmbed(characters, targetUser)],
  });
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

async function getActiveStatistics(guildId) {
  const statistics = await getStatisticsService().listStatistics(guildId);

  return statistics.filter((statistic) => statistic.isActive !== false);
}

function createCharacterStatistics(statistics) {
  return Object.fromEntries(
    statistics.map((statistic) => [statistic.id, statistic.defaultValue]),
  );
}

function canManageCharacter(interaction, character) {
  return character.ownerId === interaction.user.id || canManageServer(interaction);
}

function createSimpleCharacterEmbed(description) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.neutral)
    .setDescription(description);
}

function createSuccessDescription(emoji, title, character, actionLabel, statisticCount = null) {
  const lines = [
    `### \\${emoji} **${title}**`,
    `Le personnage **${character.name}** (\`${character.id}\`) a été ${actionLabel} avec succès.`,
  ];

  if (statisticCount !== null) {
    lines.push(`**${formatCount(statisticCount, "statistique")}** ${statisticCount === 1 ? "a été attribuée" : "ont été attribuées"} automatiquement.`);
  }

  return lines.join("\n");
}

function createCharactersListEmbed(characters, targetUser) {
  if (characters.length === 0) {
    return new EmbedBuilder()
      .setColor(CHARACTER_COLORS.warning)
      .setDescription([
        "### \\🎭 **Liste des personnages**",
        `<@${targetUser.id}> n'a aucun personnage actif sur ce serveur.`,
      ].join("\n"));
  }

  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription([
      "### \\🎭 **Liste des personnages**",
      `Retrouvez ci-dessous les personnages de <@${targetUser.id}>.`,
    ].join("\n"))
    .addFields(characters.slice(0, 25).map(createCharacterListField));
}

function createCharacterListField(character) {
  return {
    name: character.name,
    value: [
      `**ID** | *\`${character.id}\`*`,
      `**Proxy** | \`${character.proxy}\``,
      `**Statut** | **\`${formatCharacterStatus(character)}\`**`,
    ].join("\n"),
    inline: true,
  };
}

function createCharacterViewPayload(character, activeStatistics, contextId, selectedPanel = CHARACTER_VIEW_PANELS.profile) {
  return {
    embeds: [createCharacterViewEmbed(character, activeStatistics, selectedPanel)],
    components: [createCharacterViewButtonRow(contextId, selectedPanel)],
  };
}

function createCharacterViewEmbed(character, activeStatistics, selectedPanel) {
  if (selectedPanel === CHARACTER_VIEW_PANELS.information) {
    return createCharacterInformationEmbed(character);
  }

  if (selectedPanel === CHARACTER_VIEW_PANELS.statistics) {
    return createCharacterStatisticsEmbed(character, activeStatistics);
  }

  if (selectedPanel === CHARACTER_VIEW_PANELS.economy) {
    return createCharacterEconomyEmbed(character);
  }

  return createCharacterProfileEmbed(character);
}

function createCharacterProfileEmbed(character) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(truncateText([
      `### \\🎭 Personnage : **${character.name}**`,
      character.description,
    ].join("\n"), 4000))
    .setImage(character.avatarUrl);
}

function createCharacterInformationEmbed(character) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(`### \\ℹ️ **Informations — ${character.name}**`)
    .addFields(
      {
        name: "ID",
        value: `\`${character.id}\``,
        inline: true,
      },
      {
        name: "Proxy",
        value: `\`${character.proxy}\``,
        inline: true,
      },
      {
        name: "Statut",
        value: `**\`${formatCharacterStatus(character)}\`**`,
        inline: true,
      },
    )
    .setImage(character.avatarUrl);
}

function createCharacterStatisticsEmbed(character, activeStatistics) {
  const characterStatistics = character.statistics || {};
  const statisticFields = activeStatistics
    .filter((statistic) => hasCharacterStatistic(characterStatistics, statistic.id))
    .slice(0, 25)
    .map((statistic) => ({
      name: `${statistic.emoji ? `${statistic.emoji} ` : ""}${statistic.name}`,
      value: `**\`${characterStatistics[statistic.id]}\`**`,
      inline: true,
    }));

  const embed = new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(`### \\🧬 **Statistiques — ${character.name}**`)
    .setImage(character.avatarUrl);

  if (statisticFields.length === 0) {
    return embed.setDescription([
      `### \\🧬 **Statistiques — ${character.name}**`,
      "Ce personnage ne possède aucune statistique active.",
    ].join("\n"));
  }

  return embed.addFields(statisticFields);
}

function createCharacterEconomyEmbed(character) {
  const economy = getEconomyService().normalizeEconomy(character.economy);

  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(`### \\💰 **Économie — ${character.name}**`)
    .addFields(
      {
        name: "💵 Sur soi",
        value: `**\`${formatCurrency(economy.wallet)}\`**`,
        inline: true,
      },
      {
        name: "🏦 Banque",
        value: `**\`${formatCurrency(economy.bank)}\`**`,
        inline: true,
      },
      {
        name: "💰 Total",
        value: `**\`${formatCurrency(economy.wallet + economy.bank)}\`**`,
        inline: true,
      },
    )
    .setImage(character.avatarUrl);
}

function createCharacterViewButtonRow(contextId, selectedPanel) {
  return new ActionRowBuilder().addComponents(
    createCharacterViewButton(contextId, CHARACTER_VIEW_PANELS.information, "Informations", "ℹ️", selectedPanel),
    createCharacterViewButton(contextId, CHARACTER_VIEW_PANELS.statistics, "Statistiques", "🧬", selectedPanel),
    createCharacterViewButton(contextId, CHARACTER_VIEW_PANELS.economy, "Économie", "💰", selectedPanel),
  );
}

function createCharacterViewButton(contextId, panel, label, emoji, selectedPanel) {
  return new ButtonBuilder()
    .setCustomId(`${CHARACTER_VIEW_BUTTON_PREFIX}:${contextId}:${panel}`)
    .setEmoji(emoji)
    .setLabel(label)
    .setStyle(panel === selectedPanel ? ButtonStyle.Primary : ButtonStyle.Secondary);
}

function hasCharacterStatistic(characterStatistics, statisticId) {
  return Object.prototype.hasOwnProperty.call(characterStatistics, statisticId);
}

async function replyWithError(interaction, message) {
  await sendCharacterResponse(interaction, {
    content: message,
    flags: MessageFlags.Ephemeral,
  });
}

function formatCharacterStatus(character) {
  return character.isActive === false ? "🔴 Inactif" : "🟢 Actif";
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}

function formatCurrency(amount) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ¥`;
}

function normalizeSearchText(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function truncateChoiceName(value) {
  return truncateText(value, 100);
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
