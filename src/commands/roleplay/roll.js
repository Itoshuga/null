const {
  EmbedBuilder,
  SlashCommandBuilder,
} = require("discord.js");

const ROLL_COLORS = {
  neutral: 0xf2f4f8,
  detail: 0xc9ced8,
  success: 0xdfe6ef,
  failure: 0x8d94a0,
  critical: 0xffffff,
};

const DICE_LIMITS = {
  maxDice: 50,
  maxSides: 1000,
};

const DEFAULT_STAT_DICE = "1d100";

const DIFFICULTIES = {
  easy: {
    label: "Facile",
    threshold: 40,
  },
  normal: {
    label: "Normale",
    threshold: 50,
  },
  hard: {
    label: "Difficile",
    threshold: 65,
  },
  very_hard: {
    label: "Très difficile",
    threshold: 80,
  },
};

module.exports = {
  name: "roll",
  description: "Lance des jets de dés roleplay.",
  category: "Roleplay",
  usage: "/roll <dice|stat|custom>",
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Lance des jets de dés roleplay.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("dice")
        .setDescription("Lance un jet de dés simple.")
        .addStringOption((option) =>
          option
            .setName("dice")
            .setDescription("Notation du jet, par exemple 1d20, 2d6 ou 1d100.")
            .setRequired(true)
            .setMaxLength(12),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stat")
        .setDescription("Lance un jet basé sur la statistique d'un personnage.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage utilisé pour le jet.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique utilisée pour influencer le jet.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("dice")
            .setDescription("Notation du jet, par exemple 1d20, 1d60 ou 2d12.")
            .setRequired(false)
            .setMaxLength(12),
        )
        .addStringOption((option) =>
          option
            .setName("difficulty")
            .setDescription("Difficulté du jet.")
            .setRequired(false)
            .addChoices(
              { name: "Facile", value: "easy" },
              { name: "Normale", value: "normal" },
              { name: "Difficile", value: "hard" },
              { name: "Très difficile", value: "very_hard" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Raison ou action du jet.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("custom")
        .setDescription("Lance un jet libre avec un modificateur manuel.")
        .addStringOption((option) =>
          option
            .setName("dice")
            .setDescription("Notation du jet, par exemple 1d20, 2d6 ou 1d100.")
            .setRequired(true)
            .setMaxLength(12),
        )
        .addIntegerOption((option) =>
          option
            .setName("modifier")
            .setDescription("Bonus ou malus manuel appliqué au résultat.")
            .setRequired(false)
            .setMinValue(-100)
            .setMaxValue(100),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Raison ou action du jet.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    ),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply();

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
  },

  async autocomplete(interaction) {
    if (!interaction.guildId) {
      await interaction.respond([]);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "character") {
      await autocompleteCharacters(interaction, focusedOption.value);
      return;
    }

    if (focusedOption.name === "statistic") {
      await autocompleteStatistics(interaction, focusedOption.value);
      return;
    }

    await interaction.respond([]);
  },
};

function getCharacterService() {
  return require("../../services/characterService");
}

function getStatisticsService() {
  return require("../../services/statisticsService");
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

  const roll = rollDice(parsedDice);
  const rawRoll = roll.total;
  const statisticValue = character.statistics?.[statistic.id] ?? statistic.defaultValue;
  const mastery = calculateMastery(statisticValue, statistic.maxValue);
  const masteryTier = scaleMasteryTier(getMasteryTier(mastery), roll);
  const finalResult = rawRoll + masteryTier.modifier;
  const difficulty = scaleDifficulty(DIFFICULTIES[difficultyKey] || DIFFICULTIES.normal, roll);
  const criticalType = getCriticalType(rawRoll, roll);
  const success = getRollSuccess(finalResult, difficulty.threshold, criticalType);

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
        roll,
        statistic,
        statisticValue,
        success,
      }),
    ],
  });
}

async function autocompleteCharacters(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
  const choices = characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return character.isActive !== false && searchableText.includes(normalizedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(character.name),
      value: character.id,
    }));

  await interaction.respond(choices);
}

async function autocompleteStatistics(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const statistics = await getStatisticsService().listStatistics(interaction.guildId);
  const choices = statistics
    .filter((statistic) => {
      const searchableText = normalizeSearchText(`${statistic.name} ${statistic.id} ${statistic.category || ""}`);

      return statistic.isActive !== false && searchableText.includes(normalizedValue);
    })
    .slice(0, 25)
    .map((statistic) => ({
      name: truncateChoiceName(statistic.name),
      value: statistic.id,
    }));

  await interaction.respond(choices);
}

async function getActiveStatistic(guildId, statisticId) {
  const statistic = await getStatisticsService().getStatistic(guildId, statisticId);

  if (!statistic || statistic.isActive === false) {
    return null;
  }

  return statistic;
}

function parseDiceNotation(value) {
  const normalizedValue = value.trim().toLowerCase().replace(/\s+/g, "");
  const match = normalizedValue.match(/^(\d*)d(\d+)$/);

  if (!match) {
    return {
      isValid: false,
      error: "Le format du dé doit ressembler à `1d20`, `2d6` ou `1d100`.",
    };
  }

  const diceCount = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);

  if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > DICE_LIMITS.maxDice) {
    return {
      isValid: false,
      error: `Le nombre de dés doit être compris entre 1 et ${DICE_LIMITS.maxDice}.`,
    };
  }

  if (!Number.isInteger(sides) || sides < 2 || sides > DICE_LIMITS.maxSides) {
    return {
      isValid: false,
      error: `Le nombre de faces doit être compris entre 2 et ${DICE_LIMITS.maxSides}.`,
    };
  }

  return {
    isValid: true,
    count: diceCount,
    sides,
    notation: `${diceCount}d${sides}`,
  };
}

function rollDice(dice) {
  const rolls = Array.from({ length: dice.count }, () => randomBetween(1, dice.sides));
  const total = rolls.reduce((sum, value) => sum + value, 0);

  return {
    ...dice,
    rolls,
    total,
  };
}

function randomBetween(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function calculateMastery(value, maxValue) {
  if (!maxValue || maxValue <= 0) {
    return 0;
  }

  return clamp(Math.round((value / maxValue) * 100), 0, 100);
}

function getMasteryTier(mastery) {
  if (mastery <= 32) {
    return {
      label: "Faible maîtrise",
      modifier: -15,
    };
  }

  if (mastery <= 66) {
    return {
      label: "Maîtrise normale",
      modifier: 0,
    };
  }

  return {
    label: "Bonne maîtrise",
    modifier: 10,
  };
}

function scaleMasteryTier(masteryTier, roll) {
  return {
    ...masteryTier,
    baseModifier: masteryTier.modifier,
    modifier: scaleModifierToDice(masteryTier.modifier, roll),
  };
}

function scaleModifierToDice(modifier, roll) {
  if (modifier === 0) {
    return 0;
  }

  const scaledModifier = Math.round(modifier * (getMaximumRoll(roll) / 100));

  if (scaledModifier === 0) {
    return modifier > 0 ? 1 : -1;
  }

  return scaledModifier;
}

function scaleDifficulty(difficulty, roll) {
  const minimumRoll = getMinimumRoll(roll);
  const threshold = Math.max(minimumRoll, Math.round(getMaximumRoll(roll) * (difficulty.threshold / 100)));

  return {
    ...difficulty,
    percentThreshold: difficulty.threshold,
    threshold,
  };
}

function getMinimumRoll(roll) {
  return roll.count;
}

function getMaximumRoll(roll) {
  return roll.count * roll.sides;
}

function getCriticalType(rawRoll, roll) {
  const criticalWindow = Math.max(1, Math.round(getMaximumRoll(roll) * 0.05));
  const failureThreshold = getMinimumRoll(roll) + criticalWindow - 1;
  const successThreshold = getMaximumRoll(roll) - criticalWindow + 1;

  if (rawRoll <= failureThreshold) {
    return "failure";
  }

  if (rawRoll >= successThreshold) {
    return "success";
  }

  return null;
}

function getRollSuccess(finalResult, threshold, criticalType) {
  if (criticalType === "failure") {
    return false;
  }

  if (criticalType === "success") {
    return true;
  }

  return finalResult >= threshold;
}

function createDiceEmbed(interaction, roll) {
  const description = [
    "### \\🎲 **Jet de dés**",
    `<@${interaction.user.id}> lance **${roll.notation}**.`,
    "",
    roll.rolls.length > 1 ? `**Détails** | ${roll.rolls.map((value) => `\`${value}\``).join(" + ")}` : null,
    `**Résultat** | **\`${roll.total}\`**`,
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(ROLL_COLORS.neutral)
    .setDescription(description)
    .setFooter({ text: "by Itoshuga" })
    .setTimestamp();
}

function createCustomEmbed(interaction, roll, modifier, finalResult, reason) {
  const description = [
    "### \\🎲 **Jet personnalisé**",
    `<@${interaction.user.id}> lance **${roll.notation}**.`,
    reason ? "" : null,
    reason ? `**Action** | ${reason}` : null,
    "",
    roll.rolls.length > 1 ? `**Détails** | ${roll.rolls.map((value) => `\`${value}\``).join(" + ")}` : null,
    `**Jet brut** | **\`${roll.total}\`**`,
    `**Modificateur** | **\`${formatModifier(modifier)}\`**`,
    `**Résultat final** | **\`${finalResult}\`**`,
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(ROLL_COLORS.detail)
    .setDescription(description)
    .setFooter({ text: "by Itoshuga" })
    .setTimestamp();
}

function createStatEmbed(rollData) {
  const {
    character,
    criticalType,
    difficulty,
    finalResult,
    mastery,
    masteryTier,
    rawRoll,
    reason,
    roll,
    statistic,
    statisticValue,
    success,
  } = rollData;
  const statisticEmoji = statistic.emoji ? `${statistic.emoji} ` : "";
  const resultLabel = formatResultLabel(success, criticalType);
  const description = [
    `### \\🎲 **Jet de ${statisticEmoji}${statistic.name} — ${character.name}**`,
    reason ? "" : null,
    reason ? `**Action** | ${reason}` : null,
    "",
    `**Dé** | **\`${roll.notation}\`**`,
    roll.rolls.length > 1 ? `**Détails** | ${roll.rolls.map((value) => `\`${value}\``).join(" + ")}` : null,
    `**Statistique** | ${statistic.name} — **\`${statisticValue}\`** / **\`${statistic.maxValue}\`**`,
    `**Maîtrise** | ${masteryTier.label}, **\`${mastery} %\`**`,
    `**Jet brut** | **\`${rawRoll}\`**`,
    `**Modificateur** | **\`${formatModifier(masteryTier.modifier)}\`**`,
    `**Résultat final** | **\`${finalResult}\`**`,
    `**Difficulté** | ${difficulty.label}, seuil **\`${difficulty.threshold}\`** (${difficulty.percentThreshold} %)`,
    `**Résultat** | **${resultLabel}**`,
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(getResultColor(success, criticalType))
    .setDescription(description)
    .setFooter({ text: "by Itoshuga" })
    .setTimestamp();
}

function formatResultLabel(success, criticalType) {
  if (criticalType === "failure") {
    return "💀 Échec critique";
  }

  if (criticalType === "success") {
    return "🌟 Réussite critique";
  }

  return success ? "✅ Réussite" : "❌ Échec";
}

function getResultColor(success, criticalType) {
  if (criticalType) {
    return ROLL_COLORS.critical;
  }

  return success ? ROLL_COLORS.success : ROLL_COLORS.failure;
}

function formatModifier(modifier) {
  if (modifier > 0) {
    return `+${modifier}`;
  }

  return String(modifier);
}

async function replyWithError(interaction, message) {
  await interaction.editReply({
    content: message,
    embeds: [],
  });
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

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
