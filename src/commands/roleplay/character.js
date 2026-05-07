const {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const CHARACTER_COLORS = {
  neutral: 0xf2f4f8,
  detail: 0xc9ced8,
  warning: 0x8d94a0,
};

const MAX_ACTIVE_CHARACTERS = 3;
const DEFAULT_STATISTICS_VERSION = 1;

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
        .setDescription("Crée un personnage roleplay.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Nom du personnage.")
            .setRequired(true)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Description roleplay du personnage.")
            .setRequired(true)
            .setMaxLength(1500),
        )
        .addStringOption((option) =>
          option
            .setName("proxy")
            .setDescription("Proxy utilisé pour parler avec ce personnage, par exemple isen:.")
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(20),
        )
        .addAttachmentOption((option) =>
          option
            .setName("avatar")
            .setDescription("Image à utiliser comme avatar du personnage.")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Modifie un personnage roleplay existant.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à modifier.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Nouveau nom du personnage.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Nouvelle description roleplay.")
            .setRequired(false)
            .setMaxLength(1500),
        )
        .addStringOption((option) =>
          option
            .setName("proxy")
            .setDescription("Nouveau proxy du personnage.")
            .setRequired(false)
            .setMinLength(3)
            .setMaxLength(20),
        )
        .addStringOption((option) =>
          option
            .setName("avatar_url")
            .setDescription("Nouveau lien direct vers l'avatar.")
            .setRequired(false)
            .setMaxLength(500),
        )
        .addAttachmentOption((option) =>
          option
            .setName("avatar")
            .setDescription("Nouvelle image d'avatar.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Supprime doucement un personnage roleplay.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à supprimer.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
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
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    if (!interaction.guildId) {
      await replyWithError(interaction, "Cette commande doit être utilisée dans un serveur Discord.");
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    await deferCharacterReply(interaction, shouldUsePrivateResponse(subcommand));

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

function getCreateValues(interaction) {
  return {
    avatarUrl: getAvatarAttachmentUrl(interaction),
    description: interaction.options.getString("description", true).trim(),
    name: interaction.options.getString("name", true).trim(),
    proxy: getCharacterService().normalizeProxy(interaction.options.getString("proxy", true)),
  };
}

function getEditValues(interaction, currentCharacter) {
  const avatarUrl = getAvatarUrl(interaction);
  const description = interaction.options.getString("description");
  const name = interaction.options.getString("name");
  const proxy = interaction.options.getString("proxy");

  return {
    avatarUrl: avatarUrl || currentCharacter.avatarUrl,
    description: description === null ? currentCharacter.description : description.trim(),
    hasChanges: [avatarUrl, description, name, proxy].some((value) => value !== null),
    name: name === null ? currentCharacter.name : name.trim(),
    proxy: proxy === null ? currentCharacter.proxy : getCharacterService().normalizeProxy(proxy),
  };
}

function getAvatarUrl(interaction) {
  const attachment = interaction.options.getAttachment("avatar");
  const avatarUrl = interaction.options.getString("avatar_url");

  if (attachment?.url) {
    return attachment.url;
  }

  return avatarUrl === null ? null : avatarUrl.trim();
}

function getAvatarAttachmentUrl(interaction) {
  const attachment = interaction.options.getAttachment("avatar", true);

  return attachment.url;
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
  const characterService = getCharacterService();
  const values = getCreateValues(interaction);
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
  const characterService = getCharacterService();
  const characterId = interaction.options.getString("character", true);
  const currentCharacter = await characterService.getCharacter(interaction.guildId, characterId);

  if (!currentCharacter) {
    await replyWithError(interaction, "Ce personnage est introuvable.");
    return;
  }

  if (!canManageCharacter(interaction, currentCharacter)) {
    await replyWithError(interaction, "Tu ne peux modifier que tes propres personnages.");
    return;
  }

  const values = getEditValues(interaction, currentCharacter);

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
  const characterService = getCharacterService();
  const characterId = interaction.options.getString("character", true);
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

  await sendCharacterResponse(interaction, {
    embeds: [createCharacterViewEmbed(character, activeStatistics)],
  });
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

function createCharacterViewEmbed(character, activeStatistics) {
  const economy = getEconomyService().normalizeEconomy(character.economy);
  const characterStatistics = character.statistics || {};
  const statisticsLines = activeStatistics
    .filter((statistic) => hasCharacterStatistic(characterStatistics, statistic.id))
    .map((statistic) => {
      const value = characterStatistics[statistic.id];
      const emoji = statistic.emoji ? `${statistic.emoji} ` : "";

      return `${emoji}**${statistic.name}** | ${value}`;
    });
  const description = [
    `### \\🎭 Personnage : **${character.name}**`,
    character.description,
    "### \\ℹ️ **Informations**",
    `**ID** | *\`${character.id}\`*`,
    `**Proxy** | \`${character.proxy}\``,
    `**Statut** | **\`${formatCharacterStatus(character)}\`**`,
    `**Propriétaire** | <@${character.ownerId}>`,
    "### \\🧬 **Statistiques**",
    statisticsLines.length > 0 ? statisticsLines.join("\n") : "Ce personnage ne possède aucune statistique active.",
    "### \\💰 **Économie**",
    `**Sur soi** | **\`${formatCurrency(economy.wallet)}\`**`,
    `**Banque** | **\`${formatCurrency(economy.bank)}\`**`,
    `**Total** | **\`${formatCurrency(economy.wallet + economy.bank)}\`**`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(truncateText(description, 4000))
    .setImage(character.avatarUrl)
    .setFooter({ text: "by Itoshuga" })
    .setTimestamp();
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
