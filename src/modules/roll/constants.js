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
  DEFAULT_STAT_DICE,
  DICE_LIMITS,
  DIFFICULTIES,
  ROLL_COLORS,
};
