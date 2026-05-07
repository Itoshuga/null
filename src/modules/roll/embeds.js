const { EmbedBuilder } = require("discord.js");

const {
  ROLL_COLORS,
} = require("./constants");

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
    progression,
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
    progression ? "" : null,
    progression ? formatProgressionLine(progression) : null,
  ].filter(Boolean).join("\n");

  return new EmbedBuilder()
    .setColor(getResultColor(success, criticalType))
    .setDescription(description)
    .setFooter({ text: "by Itoshuga" })
    .setTimestamp();
}

function formatProgressionLine(progression) {
  const statisticEmoji = progression.statistic.emoji ? `${progression.statistic.emoji} ` : "";

  return `**Progression** | ${statisticEmoji}${progression.statistic.name} gagne **+1** (**${progression.previousValue}** → **${progression.newValue}**)`;
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

module.exports = {
  createCustomEmbed,
  createDiceEmbed,
  createStatEmbed,
};
