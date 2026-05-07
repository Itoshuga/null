function getCharacterService() {
  return require("../../services/characterService");
}

function getEconomyService() {
  return require("../../services/economyService");
}

async function getOwnedEconomyContext(interaction, characterId) {
  const [settings, character] = await Promise.all([
    getEconomyService().getEconomySettings(interaction.guildId),
    getCharacterService().getCharacter(interaction.guildId, characterId),
  ]);

  if (!character || character.isActive === false) {
    throw new (getEconomyService().EconomyError)("character_not_found", "Ce personnage est introuvable ou inactif.");
  }

  if (character.ownerId !== interaction.user.id) {
    throw new (getEconomyService().EconomyError)("not_owner", "Tu ne peux consulter que tes propres personnages.");
  }

  return {
    character,
    economy: getEconomyService().normalizeEconomy(character.economy, settings),
    settings,
  };
}

function formatCurrency(amount, settings) {
  const formattedAmount = new Intl.NumberFormat("fr-FR").format(amount);

  return `${formattedAmount} ${settings.currencySymbol}`;
}

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours > 1 ? "heures" : "heure"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes > 1 ? "minutes" : "minute"}`);
  }

  return parts.join(" ");
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

module.exports = {
  formatCurrency,
  formatDuration,
  getCharacterService,
  getEconomyService,
  getOwnedEconomyContext,
  normalizeSearchText,
  truncateChoiceName,
};
