const { EmbedBuilder } = require("discord.js");

const { ITEM_COLOR } = require("./constants");
const {
  formatCurrency,
  formatItemName,
  getShopService,
  getStockLabel,
} = require("./shared");

function createInventoryEmbed(context, inventory) {
  const displayedItems = inventory.slice(0, 25);
  const description = inventory.length === 0
    ? "Cet inventaire est vide."
    : displayedItems.map((item) => [
      `${item.emoji || "▫️"} **${item.name}**`,
      `Quantité : **\`${item.quantity}\`**`,
      `Prix d'achat : **\`${formatCurrency(item.purchasePrice || 0, context.settings)}\`**`,
    ].join("\n")).join("\n\n");

  return createSimpleEmbed([
    `### \\🎒 **Inventaire de ${context.character.name}**`,
    description,
    inventory.length > displayedItems.length ? "" : null,
    inventory.length > displayedItems.length ? `Affichage des 25 premiers objets sur ${inventory.length}.` : null,
  ].filter((line) => line !== null).join("\n"));
}

function createUseEmbed(context, inventoryItem) {
  return createSimpleEmbed([
    "### \\✨ **Objet utilisé**",
    `**${context.character.name}** utilise **${formatItemName(inventoryItem)}**.`,
  ].join("\n"));
}

function createPurchaseEmbed(result) {
  return createSimpleEmbed([
    "### \\✅ **Achat effectué**",
    `**${result.character.name}** a acheté **${formatItemName(result.item)}**.`,
    "",
    `**Prix** | **\`${formatCurrency(result.item.price, result.settings)}\`**`,
    `**Solde sur soi** | **\`${formatCurrency(result.economy.wallet, result.settings)}\`**`,
  ].join("\n"));
}

function createSaleEmbed(result) {
  return createSimpleEmbed([
    "### \\💰 **Objet vendu**",
    `**${result.character.name}** a vendu **${formatItemName(result.inventoryItem)}**.`,
    "",
    `**Gain** | **\`${formatCurrency(result.sellPrice, result.settings)}\`**`,
    `**Solde sur soi** | **\`${formatCurrency(result.economy.wallet, result.settings)}\`**`,
    `**Quantité restante** | **\`${result.quantity}\`**`,
  ].join("\n"));
}

function createItemInfoEmbed(item, settings) {
  const stockLabel = getStockLabel(item) || "Illimité";
  const status = item.isEnabled === false ? "🔴 Indisponible" : "🟢 Disponible";

  return createSimpleEmbed([
    `### \\${item.emoji || "🏷️"} **${item.name}**`,
    item.description || "Aucune description.",
    "",
    `**ID** | *${item.id}*`,
    `**Catégorie** | ${getShopService().getCategoryLabel(item.category)}`,
    `**Statut** | **${status}**`,
    `**Prix** | **\`${formatCurrency(item.price, settings)}\`**`,
    `**Stock** | **\`${stockLabel}\`**`,
  ].join("\n"));
}

function createSimpleEmbed(description) {
  return new EmbedBuilder()
    .setColor(ITEM_COLOR)
    .setDescription(description);
}

module.exports = {
  createInventoryEmbed,
  createItemInfoEmbed,
  createPurchaseEmbed,
  createSaleEmbed,
  createUseEmbed,
};
