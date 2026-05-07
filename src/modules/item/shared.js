function getCharacterService() {
  return require("../../services/characterService");
}

function getEconomyService() {
  return require("../../services/economyService");
}

function getShopService() {
  return require("../../services/shopService");
}

function validateOwnedCharacter(character, userId) {
  if (!character || character.isActive === false || character.isDeleted) {
    throw new (getShopService().ShopError)("character_not_found", "Ce personnage est introuvable ou inactif.");
  }

  if (character.ownerId !== userId) {
    throw new (getShopService().ShopError)("not_owner", "Tu ne peux utiliser que tes propres personnages.");
  }
}

function formatCurrency(amount, settings) {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${settings.currencySymbol}`;
}

function formatShopItem(item, settings) {
  const stockLabel = getStockLabel(item);

  return [
    `${item.emoji ? `${item.emoji} ` : ""}**${item.name}**`,
    truncateText(item.description || "Aucune description.", 420),
    `Prix : \`${formatCurrency(item.price, settings)}\``,
    stockLabel ? `Stock : **\`${stockLabel}\`**` : null,
  ].filter(Boolean).join("\n");
}

function formatItemName(item) {
  return `${item.emoji ? `${item.emoji} ` : ""}${item.name}`;
}

function getStockLabel(item) {
  if (!item.isLimited) {
    return null;
  }

  const stock = Number.isInteger(item.stock) ? item.stock : 0;

  return stock > 0 ? `${stock} restant${stock > 1 ? "s" : ""}` : "épuisé";
}

function isItemSoldOut(item) {
  return item.isLimited && (!Number.isInteger(item.stock) || item.stock <= 0);
}

function normalizeSearchText(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function truncateButtonLabel(value) {
  return value.length <= 80 ? value : `${value.slice(0, 77)}...`;
}

function truncateChoiceName(value) {
  return value.length <= 100 ? value : `${value.slice(0, 97)}...`;
}

function truncateText(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 3)}...`;
}

module.exports = {
  formatCurrency,
  formatItemName,
  formatShopItem,
  getCharacterService,
  getEconomyService,
  getShopService,
  getStockLabel,
  isItemSoldOut,
  normalizeSearchText,
  truncateButtonLabel,
  truncateChoiceName,
  validateOwnedCharacter,
};
