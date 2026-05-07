const { MessageFlags } = require("discord.js");

const {
  DEFAULT_STATISTIC_VALUES,
} = require("./constants");
const {
  createEmptyStatsEmbed,
  createSimpleStatsEmbed,
  createStatisticEmbed,
  createStatisticsListEmbed,
  createSuccessDescription,
  formatStatisticTitle,
} = require("./embeds");
const {
  getCharacterService,
  getStatisticsService,
  getTrimmedStringOption,
  replyWithError,
  sendStatsResponse,
} = require("./shared");

async function handleStatsCommand(interaction, subcommand) {
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
      embeds: [createEmptyStatsEmbed()],
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

module.exports = {
  handleStatsCommand,
};
