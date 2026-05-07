const {
  DICE_LIMITS,
} = require("./constants");
const {
  clamp,
} = require("./shared");

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

module.exports = {
  calculateMastery,
  getCriticalType,
  getMasteryTier,
  getRollSuccess,
  parseDiceNotation,
  rollDice,
  scaleDifficulty,
  scaleMasteryTier,
};
