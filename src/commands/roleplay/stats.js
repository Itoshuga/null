const {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require("discord.js");

const STATS_COLORS = {
  neutral: 0xf2f4f8,
  detail: 0xc9ced8,
  dark: 0x2d323c,
  warning: 0x8d94a0,
};

const DEFAULT_STATISTIC_VALUES = {
  category: "Général",
  defaultValue: 10,
  emoji: "",
  isActive: true,
  maxValue: 100,
  minValue: 0,
  order: 0,
};

module.exports = {
  name: "stats",
  description: "Gère les statistiques roleplay du serveur.",
  category: "Roleplay",
  usage: "/stats <create|edit|delete|list|view>",
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Gère les statistiques roleplay du serveur.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Crée une statistique roleplay.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Nom de la statistique.")
            .setRequired(true)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Description de la statistique.")
            .setRequired(false)
            .setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName("default_value")
            .setDescription("Valeur par défaut.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("min_value")
            .setDescription("Valeur minimale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("max_value")
            .setDescription("Valeur maximale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("order")
            .setDescription("Ordre d'affichage.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Catégorie RP de la statistique.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Emoji affiché avec la statistique.")
            .setRequired(false)
            .setMaxLength(32),
        )
        .addBooleanOption((option) =>
          option
            .setName("is_active")
            .setDescription("Indique si la statistique est active.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Modifie une statistique roleplay existante.")
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique à modifier.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Nouveau nom de la statistique.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Nouvelle description de la statistique.")
            .setRequired(false)
            .setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName("default_value")
            .setDescription("Nouvelle valeur par défaut.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("min_value")
            .setDescription("Nouvelle valeur minimale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("max_value")
            .setDescription("Nouvelle valeur maximale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("order")
            .setDescription("Nouvel ordre d'affichage.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Nouvelle catégorie RP.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Nouvel emoji de la statistique.")
            .setRequired(false)
            .setMaxLength(32),
        )
        .addBooleanOption((option) =>
          option
            .setName("is_active")
            .setDescription("Active ou désactive la statistique.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Supprime doucement une statistique roleplay.")
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique à supprimer.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Liste les statistiques roleplay du serveur."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("Affiche le détail d'une statistique roleplay.")
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique à consulter.")
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

    if (["create", "edit", "delete"].includes(subcommand) && !canManageServer(interaction)) {
      await replyWithError(interaction, "Tu dois avoir la permission Gérer le serveur pour utiliser cette sous-commande.");
      return;
    }

    await deferStatsReply(interaction, shouldUsePrivateResponse(subcommand));

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
    const statistics = await getStatisticsService().listStatistics(interaction.guildId);
    const choices = statistics
      .filter((statistic) => {
        const searchableText = normalizeSearchText(`${statistic.name} ${statistic.id} ${statistic.category || ""}`);

        return searchableText.includes(focusedValue);
      })
      .slice(0, 25)
      .map((statistic) => ({
        name: truncateChoiceName(statistic.name),
        value: statistic.id,
      }));

    await interaction.respond(choices);
  },
};

function getStatisticsService() {
  return require("../../services/statisticsService");
}

function getCharacterService() {
  return require("../../services/characterService");
}

function canManageServer(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

function shouldUsePrivateResponse(subcommand) {
  return ["create", "edit", "delete"].includes(subcommand);
}

async function deferStatsReply(interaction, isPrivateResponse) {
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

async function sendStatsResponse(interaction, payload) {
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
    category: getTrimmedStringOption(interaction, "category") || DEFAULT_STATISTIC_VALUES.category,
    defaultValue: interaction.options.getInteger("default_value") ?? DEFAULT_STATISTIC_VALUES.defaultValue,
    description: interaction.options.getString("description") || "Aucune description.",
    emoji: getTrimmedStringOption(interaction, "emoji") || DEFAULT_STATISTIC_VALUES.emoji,
    isActive: interaction.options.getBoolean("is_active") ?? DEFAULT_STATISTIC_VALUES.isActive,
    maxValue: interaction.options.getInteger("max_value") ?? DEFAULT_STATISTIC_VALUES.maxValue,
    minValue: interaction.options.getInteger("min_value") ?? DEFAULT_STATISTIC_VALUES.minValue,
    name: interaction.options.getString("name", true).trim(),
    order: interaction.options.getInteger("order") ?? DEFAULT_STATISTIC_VALUES.order,
  };
}

function getEditValues(interaction, currentStatistic) {
  const category = interaction.options.getString("category");
  const defaultValue = interaction.options.getInteger("default_value");
  const description = interaction.options.getString("description");
  const emoji = interaction.options.getString("emoji");
  const isActive = interaction.options.getBoolean("is_active");
  const maxValue = interaction.options.getInteger("max_value");
  const minValue = interaction.options.getInteger("min_value");
  const name = interaction.options.getString("name");
  const order = interaction.options.getInteger("order");

  return {
    category: category === null ? currentStatistic.category || DEFAULT_STATISTIC_VALUES.category : category.trim(),
    defaultValue: defaultValue ?? currentStatistic.defaultValue,
    description: description === null ? currentStatistic.description : description,
    emoji: emoji === null ? currentStatistic.emoji || "" : emoji.trim(),
    hasChanges: [category, defaultValue, description, emoji, isActive, maxValue, minValue, name, order].some((value) => value !== null),
    isActive: isActive ?? currentStatistic.isActive ?? DEFAULT_STATISTIC_VALUES.isActive,
    maxValue: maxValue ?? currentStatistic.maxValue,
    minValue: minValue ?? currentStatistic.minValue,
    name: name === null ? currentStatistic.name : name.trim(),
    order: order ?? currentStatistic.order ?? DEFAULT_STATISTIC_VALUES.order,
  };
}

function getTrimmedStringOption(interaction, optionName) {
  const value = interaction.options.getString(optionName);

  return value === null ? null : value.trim();
}

function validateStatisticValues(values) {
  const errors = [];

  if (!values.name || values.name.trim().length === 0) {
    errors.push("Le nom de la statistique ne doit pas être vide.");
  }

  if (!values.category || values.category.trim().length === 0) {
    errors.push("La catégorie de la statistique ne doit pas être vide.");
  }

  if (values.minValue > values.maxValue) {
    errors.push("La valeur minimale ne peut pas être supérieure à la valeur maximale.");
  }

  if (values.defaultValue < values.minValue || values.defaultValue > values.maxValue) {
    errors.push("La valeur par défaut doit être comprise entre la valeur minimale et la valeur maximale.");
  }

  if (values.order < 0) {
    errors.push("L'ordre d'affichage ne peut pas être négatif.");
  }

  return errors;
}

async function handleCreate(interaction) {
  const statisticsService = getStatisticsService();
  const values = getCreateValues(interaction);
  const validationErrors = validateStatisticValues(values);
  const statisticId = statisticsService.createStatisticId(values.name);

  if (!statisticId) {
    validationErrors.push("Le nom doit contenir au moins une lettre ou un chiffre.");
  }

  if (validationErrors.length > 0) {
    await replyWithError(interaction, validationErrors.join("\n"));
    return;
  }

  const existingStatistic = await statisticsService.getStatistic(interaction.guildId, statisticId, {
    includeDeleted: true,
  });

  if (existingStatistic && !existingStatistic.isDeleted) {
    await replyWithError(interaction, "Une statistique avec cet identifiant existe déjà.");
    return;
  }

  const now = new Date().toISOString();
  const statisticData = {
    id: statisticId,
    name: values.name,
    description: values.description,
    defaultValue: values.defaultValue,
    minValue: values.minValue,
    maxValue: values.maxValue,
    category: values.category,
    emoji: values.emoji,
    order: values.order,
    isActive: values.isActive,
    isDeleted: false,
    createdBy: interaction.user.id,
    updatedBy: interaction.user.id,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await statisticsService.createStatistic(interaction.guildId, statisticData);
  await getCharacterService().addStatisticToActiveCharacters(interaction.guildId, statisticData.id, statisticData.defaultValue);

  await sendStatsResponse(interaction, {
    embeds: [createSimpleStatsEmbed(createSuccessDescription("✅", "Statistique créée", statisticData, "créée"))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleEdit(interaction) {
  const statisticsService = getStatisticsService();
  const statisticId = interaction.options.getString("statistic", true);
  const currentStatistic = await statisticsService.getStatistic(interaction.guildId, statisticId);

  if (!currentStatistic) {
    await replyWithError(interaction, "❌ Cette statistique est introuvable.");
    return;
  }

  const values = getEditValues(interaction, currentStatistic);

  if (!values.hasChanges) {
    await replyWithError(interaction, "Aucune modification n'a été fournie.");
    return;
  }

  const validationErrors = validateStatisticValues(values);

  if (validationErrors.length > 0) {
    await replyWithError(interaction, validationErrors.join("\n"));
    return;
  }

  const updatedAt = new Date().toISOString();
  const updatedStatistic = {
    ...currentStatistic,
    name: values.name,
    description: values.description,
    defaultValue: values.defaultValue,
    minValue: values.minValue,
    maxValue: values.maxValue,
    category: values.category,
    emoji: values.emoji,
    order: values.order,
    isActive: values.isActive,
    updatedBy: interaction.user.id,
    updatedAt,
  };

  await statisticsService.updateStatistic(interaction.guildId, statisticId, {
    name: updatedStatistic.name,
    description: updatedStatistic.description,
    defaultValue: updatedStatistic.defaultValue,
    minValue: updatedStatistic.minValue,
    maxValue: updatedStatistic.maxValue,
    category: updatedStatistic.category,
    emoji: updatedStatistic.emoji,
    order: updatedStatistic.order,
    isActive: updatedStatistic.isActive,
    updatedBy: updatedStatistic.updatedBy,
    updatedAt,
  });

  await sendStatsResponse(interaction, {
    embeds: [createSimpleStatsEmbed(createSuccessDescription("✏️", "Statistique modifiée", updatedStatistic, "mise à jour"))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleDelete(interaction) {
  const statisticsService = getStatisticsService();
  const statisticId = interaction.options.getString("statistic", true);
  const statistic = await statisticsService.getStatistic(interaction.guildId, statisticId);

  if (!statistic) {
    await replyWithError(interaction, "❌ Cette statistique est introuvable.");
    return;
  }

  await statisticsService.softDeleteStatistic(interaction.guildId, statisticId, {
    deletedAt: new Date().toISOString(),
    deletedBy: interaction.user.id,
  });

  await sendStatsResponse(interaction, {
    embeds: [createSimpleStatsEmbed(createSuccessDescription("🗑️", "Statistique supprimée", statistic, "supprimée"))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleList(interaction) {
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);

  if (statistics.length === 0) {
    await sendStatsResponse(interaction, {
      embeds: [
        new EmbedBuilder()
          .setColor(STATS_COLORS.warning)
          .setTitle("📊 Statistiques roleplay du serveur")
          .setDescription("Aucune statistique roleplay n'est configurée sur ce serveur."),
      ],
    });
    return;
  }

  await sendStatsResponse(interaction, {
    embeds: [createStatisticsListEmbed(statistics)],
  });
}

async function handleView(interaction) {
  const statisticId = interaction.options.getString("statistic", true);
  const statistic = await getStatisticsService().getStatistic(interaction.guildId, statisticId);

  if (!statistic) {
    await replyWithError(interaction, "❌ Cette statistique est introuvable.");
    return;
  }

  await sendStatsResponse(interaction, {
    embeds: [createStatisticEmbed(statistic, formatStatisticTitle(statistic))],
  });
}

function createStatisticsListEmbed(statistics) {
  const displayedStatistics = statistics.slice(0, 25);
  const description = [
    "### \\🧬 **Liste des statistiques**",
    "Retrouvez ci-dessous l’ensemble des statistiques pouvant être attribuées à vos personnages.",
    statistics.length > 25 ? "" : null,
    statistics.length > 25 ? `Affichage des 25 premières statistiques sur ${statistics.length}.` : null,
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(STATS_COLORS.dark)
    .setDescription(description)
    .addFields(displayedStatistics.map(createStatisticListField));
}

function createStatisticListField(statistic) {
  return {
    name: formatStatisticChoice(statistic),
    value: [
      `**ID** | *\`${statistic.id}\`*`,
      `**Catégorie** | ${statistic.category || DEFAULT_STATISTIC_VALUES.category}`,
      `**Statut** | **\`${formatStatisticStatus(statistic)}\`**`,
      `**Défaut** | ${statistic.defaultValue}`,
      `**Min/Max** | **\`${statistic.minValue}\`** / **\`${statistic.maxValue}\`**`,
    ].join("\n"),
    inline: true,
  };
}

function createSimpleStatsEmbed(description) {
  return new EmbedBuilder()
    .setColor(STATS_COLORS.neutral)
    .setDescription(description);
}

function createSuccessDescription(emoji, title, statistic, actionLabel) {
  return [
    `### \\${emoji} **${title}**`,
    `La statistique **${statistic.name}** (\`${statistic.id}\`) a été ${actionLabel} avec succès.`,
  ].join("\n");
}

function createStatisticEmbed(statistic, title) {
  const status = formatStatisticStatus(statistic);
  const description = [
    `### **\\${title}**`,
    "",
    statistic.description || "Aucune description.",
    "",
    `**ID** | *\`${statistic.id}\`*`,
    `**Catégorie** | ${statistic.category || DEFAULT_STATISTIC_VALUES.category}`,
    `**Statut** | **\`${status}\`**`,
    `**Défaut** | ${statistic.defaultValue}`,
    `**Min/Max** | **\`${statistic.minValue}\`** / **\`${statistic.maxValue}\`**`,
  ].join("\n");

  return new EmbedBuilder()
    .setColor(STATS_COLORS.detail)
    .setDescription(description)
}

async function replyWithError(interaction, message) {
  await sendStatsResponse(interaction, {
    content: message,
    flags: MessageFlags.Ephemeral,
  });
}

function formatStatisticTitle(statistic) {
  const emoji = statistic.emoji ? `${statistic.emoji} ` : "";

  return `${emoji}Statistique : ${statistic.name}`;
}

function formatStatisticChoice(statistic) {
  return statistic.emoji ? `\\${statistic.emoji} ${statistic.name}` : statistic.name;
}

function formatStatisticStatus(statistic) {
  return statistic.isActive === false ? "\🔴 Inactive" : "\🟢 Active";
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
