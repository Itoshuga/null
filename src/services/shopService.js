class ShopError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ShopError";
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_CATEGORY = "misc";
const CATEGORY_LABELS = {
  vehicles: "Véhicules",
  weapons: "Armes",
  properties: "Immobilier",
  consumables: "Consommables",
  misc: "Divers",
};

function getDb() {
  return require("./firebase").db;
}

function getEconomyService() {
  return require("./economyService");
}

function getGuildDocument(guildId) {
  return getDb().collection("guilds").doc(guildId);
}

function getCharactersCollection(guildId) {
  return getGuildDocument(guildId).collection("characters");
}

function getInventoryCollection(guildId, characterId) {
  return getCharactersCollection(guildId).doc(characterId).collection("inventory");
}

function getShopItemsCollection(guildId) {
  return getGuildDocument(guildId).collection("shopItems");
}

function getTransactionsCollection(guildId) {
  return getGuildDocument(guildId).collection("transactions");
}

function createShopItemId(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getShopItem(guildId, itemId, options = {}) {
  const snapshot = await getShopItemsCollection(guildId).doc(itemId).get();

  if (!snapshot.exists) {
    return null;
  }

  const item = snapshot.data();

  if (!options.includeDeleted && item.isDeleted) {
    return null;
  }

  if (!options.includeDisabled && item.isEnabled === false) {
    return null;
  }

  return item;
}

async function listShopItems(guildId, options = {}) {
  const snapshot = await getShopItemsCollection(guildId).get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((item) => options.includeDeleted || !item.isDeleted)
    .filter((item) => options.includeDisabled || item.isEnabled !== false)
    .filter((item) => !options.category || item.category === options.category)
    .sort((firstItem, secondItem) => {
      const categoryComparison = getCategoryLabel(firstItem.category).localeCompare(
        getCategoryLabel(secondItem.category),
        "fr",
      );

      if (categoryComparison !== 0) {
        return categoryComparison;
      }

      return firstItem.name.localeCompare(secondItem.name, "fr");
    });
}

async function getInventoryItem(guildId, characterId, itemId) {
  const snapshot = await getInventoryCollection(guildId, characterId).doc(itemId).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data();
}

async function listInventoryItems(guildId, characterId) {
  const snapshot = await getInventoryCollection(guildId, characterId).get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((item) => item.quantity > 0)
    .sort((firstItem, secondItem) => firstItem.name.localeCompare(secondItem.name, "fr"));
}

async function createShopItem(guildId, itemData) {
  await getShopItemsCollection(guildId).doc(itemData.id).set(itemData);
}

async function updateShopItem(guildId, itemId, updatedData) {
  await getShopItemsCollection(guildId).doc(itemId).update(updatedData);
}

async function softDeleteShopItem(guildId, itemId, deletionData) {
  await getShopItemsCollection(guildId).doc(itemId).update({
    isDeleted: true,
    isEnabled: false,
    deletedAt: deletionData.deletedAt,
    deletedBy: deletionData.deletedBy,
    updatedAt: deletionData.deletedAt,
    updatedBy: deletionData.deletedBy,
  });
}

async function setShopItemEnabled(guildId, itemId, isEnabled, updatedData) {
  await getShopItemsCollection(guildId).doc(itemId).update({
    isEnabled,
    updatedAt: updatedData.updatedAt,
    updatedBy: updatedData.updatedBy,
  });
}

async function setShopItemStock(guildId, itemId, stock, updatedData) {
  await getShopItemsCollection(guildId).doc(itemId).update({
    isLimited: true,
    stock,
    updatedAt: updatedData.updatedAt,
    updatedBy: updatedData.updatedBy,
  });
}

async function purchaseItem(guildId, characterId, itemId, userId) {
  const settings = await getEconomyService().getEconomySettings(guildId);
  const characterRef = getCharactersCollection(guildId).doc(characterId);
  const itemRef = getShopItemsCollection(guildId).doc(itemId);
  const inventoryRef = getInventoryCollection(guildId, characterId).doc(itemId);

  return getDb().runTransaction(async (transaction) => {
    const [characterSnapshot, itemSnapshot, inventorySnapshot] = await Promise.all([
      transaction.get(characterRef),
      transaction.get(itemRef),
      transaction.get(inventoryRef),
    ]);

    const character = readPurchasingCharacter(characterSnapshot, userId);
    const item = readPurchasableItem(itemSnapshot);
    const inventoryItem = inventorySnapshot.exists ? inventorySnapshot.data() : null;
    const currentQuantity = inventoryItem?.quantity || 0;

    if (item.maxPerCharacter && currentQuantity >= item.maxPerCharacter) {
      throw new ShopError("max_per_character", "Ce personnage possède déjà la quantité maximale autorisée pour cet objet.");
    }

    if (item.isLimited && sanitizeStock(item.stock) <= 0) {
      throw new ShopError("out_of_stock", "Cet objet est épuisé.");
    }

    const economy = getEconomyService().normalizeEconomy(character.economy, settings);

    if (economy.wallet < item.price) {
      throw new ShopError("not_enough_wallet", "Ce personnage n'a pas assez d'argent sur lui pour acheter cet objet.");
    }

    const now = new Date().toISOString();
    const updatedEconomy = {
      ...economy,
      wallet: economy.wallet - item.price,
    };
    const updatedQuantity = currentQuantity + 1;

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt: now,
      updatedBy: userId,
    });

    transaction.set(inventoryRef, {
      itemId: item.id,
      name: item.name,
      emoji: item.emoji || "",
      quantity: updatedQuantity,
      purchasePrice: item.price,
      purchasedAt: inventoryItem?.purchasedAt || now,
      updatedAt: now,
    });

    if (item.isLimited) {
      transaction.update(itemRef, {
        stock: sanitizeStock(item.stock) - 1,
        updatedAt: now,
        updatedBy: userId,
      });
    }

    createShopTransaction(transaction, guildId, settings, {
      amount: item.price,
      characterId: character.id,
      characterIds: [character.id],
      characterName: character.name,
      itemId: item.id,
      itemName: item.name,
      type: "shop_purchase",
      userId,
    });

    return {
      character,
      economy: updatedEconomy,
      item,
      quantity: updatedQuantity,
      settings,
    };
  });
}

async function sellInventoryItem(guildId, characterId, itemId, userId) {
  const settings = await getEconomyService().getEconomySettings(guildId);
  const characterRef = getCharactersCollection(guildId).doc(characterId);
  const inventoryRef = getInventoryCollection(guildId, characterId).doc(itemId);

  return getDb().runTransaction(async (transaction) => {
    const [characterSnapshot, inventorySnapshot] = await Promise.all([
      transaction.get(characterRef),
      transaction.get(inventoryRef),
    ]);

    const character = readPurchasingCharacter(characterSnapshot, userId);

    if (!inventorySnapshot.exists) {
      throw new ShopError("inventory_item_not_found", "Ce personnage ne possède pas cet objet.");
    }

    const inventoryItem = inventorySnapshot.data();
    const currentQuantity = inventoryItem.quantity || 0;

    if (currentQuantity <= 0) {
      throw new ShopError("inventory_item_empty", "Ce personnage ne possède plus cet objet.");
    }

    const purchasePrice = sanitizeAmount(inventoryItem.purchasePrice);

    if (purchasePrice <= 0) {
      throw new ShopError("invalid_purchase_price", "Cet objet n'a pas de valeur de revente valide.");
    }

    const sellPrice = Math.max(1, Math.floor(purchasePrice * 0.5));
    const economy = getEconomyService().normalizeEconomy(character.economy, settings);
    const updatedEconomy = {
      ...economy,
      wallet: economy.wallet + sellPrice,
    };
    const now = new Date().toISOString();
    const updatedQuantity = currentQuantity - 1;

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt: now,
      updatedBy: userId,
    });

    if (updatedQuantity <= 0) {
      transaction.delete(inventoryRef);
    } else {
      transaction.update(inventoryRef, {
        quantity: updatedQuantity,
        updatedAt: now,
      });
    }

    createShopTransaction(transaction, guildId, settings, {
      amount: sellPrice,
      characterId: character.id,
      characterIds: [character.id],
      characterName: character.name,
      itemId: inventoryItem.itemId,
      itemName: inventoryItem.name,
      type: "shop_sale",
      userId,
    });

    return {
      character,
      economy: updatedEconomy,
      inventoryItem,
      quantity: updatedQuantity,
      sellPrice,
      settings,
    };
  });
}

function readPurchasingCharacter(snapshot, userId) {
  if (!snapshot.exists) {
    throw new ShopError("character_not_found", "Ce personnage est introuvable.");
  }

  const character = snapshot.data();

  if (character.isDeleted || character.isActive === false) {
    throw new ShopError("character_unavailable", "Ce personnage est supprimé ou inactif.");
  }

  if (character.ownerId !== userId) {
    throw new ShopError("not_owner", "Tu ne peux acheter qu'avec tes propres personnages.");
  }

  return character;
}

function readPurchasableItem(snapshot) {
  if (!snapshot.exists) {
    throw new ShopError("item_not_found", "Cet objet est introuvable.");
  }

  const item = snapshot.data();

  if (item.isDeleted || item.isEnabled === false) {
    throw new ShopError("item_unavailable", "Cet objet n'est plus disponible.");
  }

  if (!Number.isInteger(item.price) || item.price <= 0) {
    throw new ShopError("invalid_price", "Cet objet n'a pas de prix valide.");
  }

  return item;
}

function createShopTransaction(transaction, guildId, settings, transactionData) {
  if (!settings.transactionsEnabled) {
    return;
  }

  const transactionId = createTransactionId();
  const createdAt = new Date().toISOString();

  transaction.set(getTransactionsCollection(guildId).doc(transactionId), {
    currency: settings.currencySymbol,
    id: transactionId,
    reason: null,
    ...transactionData,
    createdAt,
  });
}

function createTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);

  return `${timestamp}-${randomPart}`;
}

function getCategoryLabel(category = DEFAULT_CATEGORY) {
  return CATEGORY_LABELS[category] || category;
}

function sanitizeStock(stock) {
  return Number.isInteger(stock) && stock > 0 ? stock : 0;
}

function sanitizeAmount(amount) {
  return Number.isInteger(amount) && amount > 0 ? amount : 0;
}

module.exports = {
  CATEGORY_LABELS,
  DEFAULT_CATEGORY,
  ShopError,
  createShopItem,
  createShopItemId,
  getCategoryLabel,
  getInventoryItem,
  getShopItem,
  listInventoryItems,
  listShopItems,
  purchaseItem,
  sellInventoryItem,
  setShopItemEnabled,
  setShopItemStock,
  softDeleteShopItem,
  updateShopItem,
};
