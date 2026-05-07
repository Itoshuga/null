const {
  DEFAULT_STAT_DICE,
  DIFFICULTIES,
} = require("./constants");
const {
  calculateMastery,
  getCriticalType,
  getMasteryTier,
  getRollSuccess,
  parseDiceNotation,
  rollDice,
  scaleDifficulty,
  scaleMasteryTier,
} = require("./dice");
const {
  createCustomEmbed,
  createDiceEmbed,
  createStatEmbed,
} = require("./embeds");
const {
  tryImproveRandomStatistic,
} = require("./progression");
const {
  getCharacterService,
  getStatisticsService,
  hasCharacterStatistic,
  replyWithError,
} = require("./shared");

async function handleRollCommand(interaction, subcommand) {
  if (subcommand === "dice") {
    await handleDice(interaction);
    return;
  }

  if (subcommand === "stat") {
    await handleStat(interaction);
    return;
  }

  if (subcommand === "custom") {
    await handleCustom(interaction);
  }
}

async function handleDice(interaction) {
  const diceNotation = interaction.options.getString("dice", true);
  const parsedDice = parseDiceNotation(diceNotation);

  if (!parsedDice.isValid) {
    await replyWithError(interaction, parsedDice.error);
    return;
  }

  const roll = rollDice(parsedDice);

  await interaction.editReply({
    embeds: [createDiceEmbed(interaction, roll)],
  });
}

async function handleCustom(interaction) {
  const diceNotation = interaction.options.getString("dice", true);
  const modifier = interaction.options.getInteger("modifier") ?? 0;
  const reason = interaction.options.getString("reason");
  const parsedDice = parseDiceNotation(diceNotation);

  if (!parsedDice.isValid) {
    await replyWithError(interaction, parsedDice.error);
    return;
  }

  const roll = rollDice(parsedDice);
  const finalResult = roll.total + modifier;

  await interaction.editReply({
    embeds: [createCustomEmbed(interaction, roll, modifier, finalResult, reason)],
  });
}

async function handleStat(interaction) {
  if (!interaction.guildId) {
    await replyWithError(interaction, "Cette sous-commande doit être utilisée dans un serveur Discord.");
    return;
  }

  const characterId = interaction.options.getString("character", true);
  const statisticId = interaction.options.getString("statistic", true);
  const diceNotation = interaction.options.getString("dice") || DEFAULT_STAT_DICE;
  const difficultyKey = interaction.options.getString("difficulty") || "normal";
  const reason = interaction.options.getString("reason");
  const parsedDice = parseDiceNotation(diceNotation);

  if (!parsedDice.isValid) {
    await replyWithError(interaction, parsedDice.error);
    return;
  }

  const character = await getCharacterService().getCharacter(interaction.guildId, characterId);

  if (!character || character.isActive === false) {
    await replyWithError(interaction, "Ce personnage est introuvable ou inactif.");
    return;
  }

  if (character.ownerId !== interaction.user.id) {
    await replyWithError(interaction, "Tu ne peux lancer un jet qu'avec tes propres personnages.");
    return;
  }

  const statistic = await getActiveStatistic(interaction.guildId, statisticId);

  if (!statistic) {
    await replyWithError(interaction, "Cette statistique est introuvable ou inactive.");
    return;
  }

  if (!hasCharacterStatistic(character, statistic.id)) {
    await replyWithError(interaction, "Ce personnage ne possède pas cette statistique.");
    return;
  }

  const roll = rollDice(parsedDice);
  const rawRoll = roll.total;
  const statisticValue = character.statistics[statistic.id];
  const mastery = calculateMastery(statisticValue, statistic.maxValue);
  const masteryTier = scaleMasteryTier(getMasteryTier(mastery), roll);
  const finalResult = rawRoll + masteryTier.modifier;
  const difficulty = scaleDifficulty(DIFFICULTIES[difficultyKey] || DIFFICULTIES.normal, roll);
  const criticalType = getCriticalType(rawRoll, roll);
  const success = getRollSuccess(finalResult, difficulty.threshold, criticalType);
  const progression = await tryImproveRandomStatistic(interaction.guildId, character, interaction.user.id);

  await interaction.editReply({
    embeds: [
      createStatEmbed({
        character,
        criticalType,
        difficulty,
        finalResult,
        mastery,
        masteryTier,
        rawRoll,
        reason,
        progression,
        roll,
        statistic,
        statisticValue,
        success,
      }),
    ],
  });
}

async function getActiveStatistic(guildId, statisticId) {
  const statistic = await getStatisticsService().findStatistic(guildId, statisticId);

  if (!statistic || statistic.isActive === false) {
    return null;
  }

  return statistic;
}

module.exports = {
  handleRollCommand,
};
