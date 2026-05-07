const {
  ITEMS_PER_PAGE,
} = require("./constants");
const {
  createInventoryEmbed,
  createItemInfoEmbed,
  createPurchaseEmbed,
  createSaleEmbed,
  createUseEmbed,
} = require("./embeds");
const {
  getCharacterService,
  getEconomyService,
  getShopService,
  validateOwnedCharacter,
} = require("./shared");
const {
  createShopPayload,
} = require("./shopView");

async function handleItemCommand(interaction, subcommand) {
  if (subcommand === "shop") {
    await handleShop(interaction);
    return;
  }

  if (subcommand === "inventory") {
    await handleInventory(interaction);
    return;
  }

  if (subcommand === "use") {
    await handleUse(interaction);
    return;
  }

  if (subcommand === "buy") {
    await handleBuyCommand(interaction);
    return;
  }

  if (subcommand === "sell") {
    await handleSell(interaction);
    return;
  }

  if (subcommand === "info") {
    await handleInfo(interaction);
  }
}

async function handleShop(interaction) {
  const characterId = interaction.options.getString("character", true);
  const category = interaction.options.getString("category");
  const context = await getShopContext(interaction, characterId, category, 0);

  await interaction.editReply(createShopPayload(context));
}

async function handleInventory(interaction) {
  const context = await getCharacterContext(interaction);
  const inventory = await getShopService().listInventoryItems(interaction.guildId, context.character.id);

  await interaction.editReply({
    embeds: [createInventoryEmbed(context, inventory)],
  });
}

async function handleUse(interaction) {
  const context = await getCharacterContext(interaction);
  const itemId = interaction.options.getString("item", true);
  const inventoryItem = await getShopService().getInventoryItem(interaction.guildId, context.character.id, itemId);

  if (!inventoryItem || inventoryItem.quantity <= 0) {
    throw new (getShopService().ShopError)("inventory_item_not_found", "Ce personnage ne possède pas cet objet.");
  }

  await interaction.editReply({
    embeds: [createUseEmbed(context, inventoryItem)],
  });
}

async function handleBuyCommand(interaction) {
  const characterId = interaction.options.getString("character", true);
  const itemId = interaction.options.getString("item", true);
  const result = await getShopService().purchaseItem(interaction.guildId, characterId, itemId, interaction.user.id);

  await interaction.editReply({
    embeds: [createPurchaseEmbed(result)],
  });
}

async function handleSell(interaction) {
  const characterId = interaction.options.getString("character", true);
  const itemId = interaction.options.getString("item", true);
  const result = await getShopService().sellInventoryItem(interaction.guildId, characterId, itemId, interaction.user.id);

  await interaction.editReply({
    embeds: [createSaleEmbed(result)],
  });
}

async function handleInfo(interaction) {
  const itemId = interaction.options.getString("item", true);
  const [settings, item] = await Promise.all([
    getEconomyService().getEconomySettings(interaction.guildId),
    getShopService().getShopItem(interaction.guildId, itemId),
  ]);

  if (!item) {
    throw new (getShopService().ShopError)("item_not_found", "Cet objet est introuvable.");
  }

  await interaction.editReply({
    embeds: [createItemInfoEmbed(item, settings)],
  });
}

async function getCharacterContext(interaction) {
  const characterId = interaction.options.getString("character", true);
  const [settings, character] = await Promise.all([
    getEconomyService().getEconomySettings(interaction.guildId),
    getCharacterService().getCharacter(interaction.guildId, characterId),
  ]);

  validateOwnedCharacter(character, interaction.user.id);

  return {
    character,
    settings,
  };
}

async function getShopContext(interaction, characterId, category, page) {
  const [settings, character, items] = await Promise.all([
    getEconomyService().getEconomySettings(interaction.guildId),
    getCharacterService().getCharacter(interaction.guildId, characterId),
    getShopService().listShopItems(interaction.guildId, {
      category,
    }),
  ]);

  validateOwnedCharacter(character, interaction.user.id);

  const pageCount = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(page, 0), pageCount - 1);

  return {
    category,
    character,
    guildId: interaction.guildId,
    items,
    ownerId: interaction.user.id,
    page: safePage,
    pageCount,
    settings,
  };
}

async function replyWithItemError(interaction, message) {
  await interaction.editReply({
    content: message,
    embeds: [],
    components: [],
  });
}

module.exports = {
  getShopContext,
  handleItemCommand,
  replyWithItemError,
};
