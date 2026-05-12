const {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const {
  CHARACTER_CREATE_MODAL_PREFIX,
  CHARACTER_DELETE_MODAL_PREFIX,
  CHARACTER_EDIT_MODAL_PREFIX,
} = require("./constants");
const {
  canManageServer,
  getCharacterService,
  replyWithError,
  truncateText,
} = require("./shared");

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
            .setMaxLength(500),
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

async function showCharacterDeleteModal(interaction, selectedCharacterId = null) {
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
            .setOptions(characters.slice(0, 25).map((character) => createCharacterSelectOption(character, selectedCharacterId))),
        ),
    );

  await interaction.showModal(modal);
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
            .setMaxLength(500)
            .setValue(truncateText(character.description || "", 500)),
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

async function getDeletableCharacters(interaction) {
  if (canManageServer(interaction)) {
    return getCharacterService().listCharacters(interaction.guildId);
  }

  return getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
}

function createCharacterSelectOption(character, defaultCharacterId = null) {
  const option = {
    label: truncateText(character.name, 100),
    value: character.id,
  };

  if (character.id === defaultCharacterId) {
    option.default = true;
  }

  return option;
}

function getAvatarUpload(interaction) {
  const uploadedFiles = interaction.fields.getUploadedFiles("avatar", true);

  return uploadedFiles.first() || null;
}

function getOptionalAvatarUpload(interaction) {
  const uploadedFiles = interaction.fields.getUploadedFiles("avatar", false);

  return uploadedFiles?.first() || null;
}

module.exports = {
  getCreateValuesFromModal,
  getEditValuesFromModal,
  showCharacterCreateModal,
  showCharacterDeleteModal,
  showCharacterEditModal,
};
