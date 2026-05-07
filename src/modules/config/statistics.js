const {
  DEFAULT_STATISTIC_VALUES,
  getCharacterService,
  getStatisticsService,
  getTrimmedStringOption,
  replyWithEmbed,
  replyWithError,
} = require("./shared");

async function handleStatsConfig(interaction, subcommand) {
  if (subcommand === "add") {
    await handleStatsAdd(interaction);
    return;
  }

  if (subcommand === "remove") {
    await handleStatsRemove(interaction);
  }
}

async function handleStatsAdd(interaction) {
  const statisticsService = getStatisticsService();
  const values = getStatisticCreateValues(interaction);
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
    isActive: true,
    isDeleted: false,
    createdBy: interaction.user.id,
    updatedBy: interaction.user.id,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await statisticsService.createStatistic(interaction.guildId, statisticData);
  await getCharacterService().addStatisticToActiveCharacters(
    interaction.guildId,
    statisticData.id,
    statisticData.defaultValue,
  );
  await replyWithEmbed(interaction, `### \\✅ **Statistique ajoutée**\nLa statistique **${statisticData.name}** (\`${statisticData.id}\`) a été ajoutée avec succès.`);
}

async function handleStatsRemove(interaction) {
  const statisticId = interaction.options.getString("statistic", true);
  const statistic = await getStatisticsService().getStatistic(interaction.guildId, statisticId);

  if (!statistic) {
    await replyWithError(interaction, "Cette statistique est introuvable.");
    return;
  }

  await getStatisticsService().softDeleteStatistic(interaction.guildId, statisticId, {
    deletedAt: new Date().toISOString(),
    deletedBy: interaction.user.id,
  });

  await replyWithEmbed(interaction, `### \\🗑️ **Statistique retirée**\nLa statistique **${statistic.name}** (\`${statistic.id}\`) a été retirée avec succès.`);
}

function getStatisticCreateValues(interaction) {
  return {
    category: getTrimmedStringOption(interaction, "category") || DEFAULT_STATISTIC_VALUES.category,
    defaultValue: interaction.options.getInteger("default_value") ?? DEFAULT_STATISTIC_VALUES.defaultValue,
    description: interaction.options.getString("description") || "Aucune description.",
    emoji: getTrimmedStringOption(interaction, "emoji") || DEFAULT_STATISTIC_VALUES.emoji,
    maxValue: interaction.options.getInteger("max_value") ?? DEFAULT_STATISTIC_VALUES.maxValue,
    minValue: interaction.options.getInteger("min_value") ?? DEFAULT_STATISTIC_VALUES.minValue,
    name: interaction.options.getString("name", true).trim(),
    order: interaction.options.getInteger("order") ?? DEFAULT_STATISTIC_VALUES.order,
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

module.exports = {
  handleStatsConfig,
};
