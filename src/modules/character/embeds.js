const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const {
  CHARACTER_COLORS,
  CHARACTER_LIST_BUTTON_PREFIX,
  CHARACTER_LIST_DIRECTIONS,
  CHARACTER_VIEW_BUTTON_PREFIX,
  CHARACTER_VIEW_PANELS,
} = require("./constants");
const {
  formatCount,
  formatCurrency,
  getEconomyService,
  truncateText,
} = require("./shared");

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

function createEmptyCharactersListEmbed(targetUserId) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.warning)
    .setDescription([
      "### \\🎭 **Liste des personnages**",
      `<@${targetUserId}> n'a aucun personnage actif sur ce serveur.`,
    ].join("\n"));
}

function createCharacterListPayload(characters, targetUserId, contextId, selectedCharacterId) {
  const selectedIndex = Math.max(
    characters.findIndex((character) => character.id === selectedCharacterId),
    0,
  );
  const selectedCharacter = characters[selectedIndex] || characters[0];

  return {
    embeds: [createCharacterListEmbed(selectedCharacter, targetUserId, selectedIndex, characters.length)],
    components: [
      createCharacterListPaginationRow(contextId, selectedIndex, characters.length),
    ],
  };
}

function createCharacterListEmbed(character, targetUserId, selectedIndex, totalCharacters) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(truncateText([
      `### \\🎭 **Liste des personnages de <@${targetUserId}>**`,
      "",
      `### ⊹˳˚˖ **${character.name}** ˖˚˳⊹`,
      character.description,
    ].join("\n"), 4000))
    .addFields(
      {
        name: "ID",
        value: `\`${character.id}\``,
        inline: true,
      },
      {
        name: "Proxy",
        value: `\`${character.proxy}\``,
        inline: true,
      },
      {
        name: "Statut",
        value: `**\`${formatCharacterStatus(character)}\`**`,
        inline: true,
      },
    )
    .setImage(character.avatarUrl)
    .setFooter({ text: `Personnage ${selectedIndex + 1}/${totalCharacters}` });
}

function createCharacterListPaginationRow(contextId, selectedIndex, totalCharacters) {
  return new ActionRowBuilder().addComponents(
    createCharacterListPaginationButton(
      contextId,
      CHARACTER_LIST_DIRECTIONS.previous,
      "Précédent",
      "⬅️",
      selectedIndex <= 0,
    ),
    createCharacterListPaginationButton(
      contextId,
      CHARACTER_LIST_DIRECTIONS.next,
      "Suivant",
      "➡️",
      selectedIndex >= totalCharacters - 1,
    ),
  );
}

function createCharacterListPaginationButton(contextId, direction, label, emoji, isDisabled) {
  return new ButtonBuilder()
    .setCustomId(`${CHARACTER_LIST_BUTTON_PREFIX}:${contextId}:${direction}`)
    .setEmoji(emoji)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(isDisabled);
}

function createCharacterViewPayload(
  character,
  activeStatistics,
  contextId,
  selectedPanel = CHARACTER_VIEW_PANELS.profile,
  economySettings = {},
) {
  return {
    embeds: [createCharacterViewEmbed(character, activeStatistics, selectedPanel, economySettings)],
    components: [createCharacterViewButtonRow(contextId, selectedPanel)],
  };
}

function createCharacterViewEmbed(character, activeStatistics, selectedPanel, economySettings) {
  if (selectedPanel === CHARACTER_VIEW_PANELS.information) {
    return createCharacterInformationEmbed(character);
  }

  if (selectedPanel === CHARACTER_VIEW_PANELS.statistics) {
    return createCharacterStatisticsEmbed(character, activeStatistics);
  }

  if (selectedPanel === CHARACTER_VIEW_PANELS.economy) {
    return createCharacterEconomyEmbed(character, economySettings);
  }

  return createCharacterProfileEmbed(character);
}

function createCharacterProfileEmbed(character) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(truncateText([
      `### \\🎭 Personnage : **${character.name}**`,
      character.description,
    ].join("\n"), 4000))
    .setImage(character.avatarUrl);
}

function createCharacterInformationEmbed(character) {
  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(`### \\ℹ️ **Informations — ${character.name}**`)
    .addFields(
      {
        name: "ID",
        value: `\`${character.id}\``,
        inline: true,
      },
      {
        name: "Proxy",
        value: `\`${character.proxy}\``,
        inline: true,
      },
      {
        name: "Statut",
        value: `**\`${formatCharacterStatus(character)}\`**`,
        inline: true,
      },
    )
    .setImage(character.avatarUrl);
}

function createCharacterStatisticsEmbed(character, activeStatistics) {
  const characterStatistics = character.statistics || {};
  const statisticFields = activeStatistics
    .filter((statistic) => hasCharacterStatistic(characterStatistics, statistic.id))
    .slice(0, 25)
    .map((statistic) => ({
      name: `${statistic.emoji ? `${statistic.emoji} ` : ""}${statistic.name}`,
      value: `**\`${characterStatistics[statistic.id]}\`**`,
      inline: true,
    }));

  const embed = new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(`### \\🧬 **Statistiques — ${character.name}**`)
    .setImage(character.avatarUrl);

  if (statisticFields.length === 0) {
    return embed.setDescription([
      `### \\🧬 **Statistiques — ${character.name}**`,
      "Ce personnage ne possède aucune statistique active.",
    ].join("\n"));
  }

  return embed.addFields(statisticFields);
}

function createCharacterEconomyEmbed(character, economySettings) {
  const economy = getEconomyService().normalizeEconomy(character.economy, economySettings);

  return new EmbedBuilder()
    .setColor(CHARACTER_COLORS.detail)
    .setDescription(`### \\💰 **Économie — ${character.name}**`)
    .addFields(
      {
        name: "💵 Sur soi",
        value: `**\`${formatCurrency(economy.wallet, economySettings)}\`**`,
        inline: true,
      },
      {
        name: "🏦 Banque",
        value: `**\`${formatCurrency(economy.bank, economySettings)}\`**`,
        inline: true,
      },
      {
        name: "💰 Total",
        value: `**\`${formatCurrency(economy.wallet + economy.bank, economySettings)}\`**`,
        inline: true,
      },
    )
    .setImage(character.avatarUrl);
}

function createCharacterViewButtonRow(contextId, selectedPanel) {
  return new ActionRowBuilder().addComponents(
    createCharacterViewButton(contextId, CHARACTER_VIEW_PANELS.information, "Informations", "ℹ️", selectedPanel),
    createCharacterViewButton(contextId, CHARACTER_VIEW_PANELS.statistics, "Statistiques", "🧬", selectedPanel),
    createCharacterViewButton(contextId, CHARACTER_VIEW_PANELS.economy, "Économie", "💰", selectedPanel),
  );
}

function createCharacterViewButton(contextId, panel, label, emoji, selectedPanel) {
  return new ButtonBuilder()
    .setCustomId(`${CHARACTER_VIEW_BUTTON_PREFIX}:${contextId}:${panel}`)
    .setEmoji(emoji)
    .setLabel(label)
    .setStyle(panel === selectedPanel ? ButtonStyle.Primary : ButtonStyle.Secondary);
}

function formatCharacterStatus(character) {
  return character.isActive === false ? "🔴 Inactif" : "🟢 Actif";
}

function hasCharacterStatistic(characterStatistics, statisticId) {
  return Object.prototype.hasOwnProperty.call(characterStatistics, statisticId);
}

module.exports = {
  createCharacterListPayload,
  createCharacterViewPayload,
  createEmptyCharactersListEmbed,
  createSimpleCharacterEmbed,
  createSuccessDescription,
};
