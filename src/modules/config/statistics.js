const {
  DEFAULT_STATISTIC_VALUES,
  getCharacterService,
  getStatisticsService,
  getTrimmedStringOption,
  replyWithEmbed,
  replyWithError,
} = require("./shared");

async function handleStatsConfig(interaction, subcommand) {
  if (subcommand === "create") {
    await handleStatsCreate(interaction);
    return;
  }

  if (subcommand === "edit") {
    await handleStatsEdit(interaction);
    return;
  }

  if (subcommand === "delete") {
    await handleStatsDelete(interaction);
    return;
  }

  if (subcommand === "add") {
    await handleCharacterStatsAdd(interaction);
    return;
  }

  if (subcommand === "remove") {
    await handleCharacterStatsRemove(interaction);
  }
}

async function handleStatsCreate(interaction) {
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

  await replyWithEmbed(interaction, `### \\✅ **Statistique créée**\nLa statistique **${statisticData.name}** (\`${statisticData.id}\`) a été créée avec succès.`);
}

async function handleStatsEdit(interaction) {
  const statisticsService = getStatisticsService();
  const statisticInput = interaction.options.getString("statistic", true);
  const currentStatistic = await statisticsService.findStatistic(interaction.guildId, statisticInput);

  if (!currentStatistic) {
    await replyWithError(interaction, "Cette statistique est introuvable.");
    return;
  }

  const values = getStatisticEditValues(interaction, currentStatistic);

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

  await statisticsService.updateStatistic(interaction.guildId, currentStatistic.id, {
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

  await replyWithEmbed(interaction, `### \\✏️ **Statistique modifiée**\nLa statistique **${updatedStatistic.name}** (\`${updatedStatistic.id}\`) a été mise à jour avec succès.`);
}

async function handleStatsDelete(interaction) {
  const statisticInput = interaction.options.getString("statistic", true);
  const statistic = await getStatisticsService().findStatistic(interaction.guildId, statisticInput);

  if (!statistic) {
    await replyWithError(interaction, "Cette statistique est introuvable.");
    return;
  }

  await getStatisticsService().softDeleteStatistic(interaction.guildId, statistic.id, {
    deletedAt: new Date().toISOString(),
    deletedBy: interaction.user.id,
  });

  await replyWithEmbed(interaction, `### \\🗑️ **Statistique supprimée**\nLa statistique **${statistic.name}** (\`${statistic.id}\`) a été supprimée avec succès.`);
}

async function handleCharacterStatsAdd(interaction) {
  const { character, statistic } = await getCharacterStatisticContext(interaction);

  if (!character || !statistic) {
    return;
  }

  const amount = interaction.options.getInteger("value", true);
  const currentValue = character.statistics[statistic.id];
  const newValue = currentValue + amount;
  const validationError = validateCharacterStatisticValue(newValue, statistic);

  if (validationError) {
    await replyWithError(interaction, validationError);
    return;
  }

  await getCharacterService().setCharacterStatistic(
    interaction.guildId,
    character.id,
    statistic.id,
    newValue,
    interaction.user.id,
  );

  await replyWithEmbed(interaction, createCharacterStatisticAddDescription(character, statistic, amount, currentValue, newValue));
}

async function handleCharacterStatsRemove(interaction) {
  const { character, statistic } = await getCharacterStatisticContext(interaction);

  if (!character || !statistic) {
    return;
  }

  const amount = interaction.options.getInteger("value", true);
  const currentValue = character.statistics[statistic.id];
  const newValue = currentValue - amount;
  const validationError = validateCharacterStatisticValue(newValue, statistic);

  if (validationError) {
    await replyWithError(interaction, validationError);
    return;
  }

  await getCharacterService().setCharacterStatistic(
    interaction.guildId,
    character.id,
    statistic.id,
    newValue,
    interaction.user.id,
  );

  await replyWithEmbed(interaction, createCharacterStatisticRemoveDescription(character, statistic, amount, currentValue, newValue));
}

async function getCharacterStatisticContext(interaction) {
  const characterId = interaction.options.getString("character", true);
  const statisticInput = interaction.options.getString("statistic", true);
  const character = await getCharacterService().getCharacter(interaction.guildId, characterId);

  if (!character || character.isActive === false) {
    await replyWithError(interaction, "Ce personnage est introuvable ou inactif.");
    return {};
  }

  const statistic = await getStatisticsService().findStatistic(interaction.guildId, statisticInput);

  if (!statistic || statistic.isActive === false) {
    await replyWithError(interaction, "Cette statistique est introuvable ou inactive.");
    return {};
  }

  if (!hasCharacterStatistic(character, statistic.id)) {
    await replyWithError(interaction, "Ce personnage ne possède pas cette statistique.");
    return {};
  }

  return {
    character,
    statistic,
  };
}

function getStatisticCreateValues(interaction) {
  return {
    category: getTrimmedStringOption(interaction, "category") || DEFAULT_STATISTIC_VALUES.category,
    defaultValue: interaction.options.getInteger("default_value") ?? DEFAULT_STATISTIC_VALUES.defaultValue,
    description: interaction.options.getString("description") || "Aucune description.",
    emoji: getTrimmedStringOption(interaction, "emoji") || DEFAULT_STATISTIC_VALUES.emoji,
    isActive: true,
    maxValue: interaction.options.getInteger("max_value") ?? DEFAULT_STATISTIC_VALUES.maxValue,
    minValue: interaction.options.getInteger("min_value") ?? DEFAULT_STATISTIC_VALUES.minValue,
    name: interaction.options.getString("name", true).trim(),
    order: interaction.options.getInteger("order") ?? DEFAULT_STATISTIC_VALUES.order,
  };
}

function getStatisticEditValues(interaction, currentStatistic) {
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

function validateCharacterStatisticValue(value, statistic) {
  if (value < statistic.minValue || value > statistic.maxValue) {
    return `La valeur doit être comprise entre ${statistic.minValue} et ${statistic.maxValue}.`;
  }

  return null;
}

function hasCharacterStatistic(character, statisticId) {
  return Object.prototype.hasOwnProperty.call(character.statistics || {}, statisticId);
}

function createCharacterStatisticAddDescription(character, statistic, amount, currentValue, newValue) {
  return [
    "### \\✅ **Points ajoutés**",
    `**${character.name}** gagne **${amount} point${amount > 1 ? "s" : ""}** en **${statistic.name}**.`,
    `**${currentValue}** → **${newValue}**`,
  ].join("\n");
}

function createCharacterStatisticRemoveDescription(character, statistic, amount, currentValue, newValue) {
  return [
    "### \\➖ **Points retirés**",
    `**${character.name}** perd **${amount} point${amount > 1 ? "s" : ""}** en **${statistic.name}**.`,
    `**${currentValue}** → **${newValue}**`,
  ].join("\n");
}

module.exports = {
  handleStatsConfig,
};
