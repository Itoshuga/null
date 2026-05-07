const {
  getShopService,
  replyWithEmbed,
  replyWithError,
} = require("./shared");

async function handleItemConfig(interaction, subcommand) {
  if (subcommand === "create") {
    await handleItemCreate(interaction);
    return;
  }

  if (subcommand === "edit") {
    await handleItemEdit(interaction);
    return;
  }

  if (subcommand === "delete") {
    await handleItemDelete(interaction);
    return;
  }

  if (["enable", "disable"].includes(subcommand)) {
    await handleItemEnableState(interaction, subcommand === "enable");
  }
}

async function handleItemCreate(interaction) {
  const shopService = getShopService();
  const values = getItemCreateValues(interaction);
  const itemId = shopService.createShopItemId(values.name);

  if (!itemId) {
    await replyWithError(interaction, "Le nom doit contenir au moins une lettre ou un chiffre.");
    return;
  }

  const existingItem = await shopService.getShopItem(interaction.guildId, itemId, {
    includeDeleted: true,
    includeDisabled: true,
  });

  if (existingItem && !existingItem.isDeleted) {
    await replyWithError(interaction, "Un objet avec cet identifiant existe déjà.");
    return;
  }

  const now = new Date().toISOString();
  const itemData = {
    id: itemId,
    name: values.name,
    emoji: values.emoji,
    description: values.description,
    price: values.price,
    category: values.category,
    isEnabled: true,
    isLimited: values.stock !== null,
    stock: values.stock,
    maxPerCharacter: values.maxPerCharacter,
    isDeleted: false,
    createdBy: interaction.user.id,
    updatedBy: interaction.user.id,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await shopService.createShopItem(interaction.guildId, itemData);
  await replyWithEmbed(interaction, `### \\✅ **Objet créé**\nL'objet **${itemData.name}** (\`${itemData.id}\`) a été ajouté au magasin.`);
}

async function handleItemEdit(interaction) {
  const shopService = getShopService();
  const itemId = interaction.options.getString("item", true);
  const item = await shopService.getShopItem(interaction.guildId, itemId, {
    includeDisabled: true,
  });

  if (!item) {
    await replyWithError(interaction, "Cet objet est introuvable.");
    return;
  }

  const updatedData = getItemEditValues(interaction);

  if (Object.keys(updatedData).length === 0) {
    await replyWithError(interaction, "Aucune modification n'a été fournie.");
    return;
  }

  updatedData.updatedAt = new Date().toISOString();
  updatedData.updatedBy = interaction.user.id;

  await shopService.updateShopItem(interaction.guildId, itemId, updatedData);
  await replyWithEmbed(interaction, `### \\✏️ **Objet modifié**\nL'objet **${item.name}** (\`${item.id}\`) a été mis à jour.`);
}

async function handleItemDelete(interaction) {
  const item = await getExistingItem(interaction);

  if (!item) {
    return;
  }

  await getShopService().softDeleteShopItem(interaction.guildId, item.id, {
    deletedAt: new Date().toISOString(),
    deletedBy: interaction.user.id,
  });

  await replyWithEmbed(interaction, `### \\🗑️ **Objet supprimé**\nL'objet **${item.name}** (\`${item.id}\`) a été supprimé du magasin.`);
}

async function handleItemEnableState(interaction, isEnabled) {
  const item = await getExistingItem(interaction);

  if (!item) {
    return;
  }

  await getShopService().setShopItemEnabled(interaction.guildId, item.id, isEnabled, {
    updatedAt: new Date().toISOString(),
    updatedBy: interaction.user.id,
  });

  await replyWithEmbed(interaction, [
    `### \\${isEnabled ? "✅" : "⏸️"} **Objet ${isEnabled ? "activé" : "désactivé"}**`,
    `L'objet **${item.name}** est maintenant ${isEnabled ? "visible" : "masqué"}.`,
  ].join("\n"));
}

async function getExistingItem(interaction) {
  const itemId = interaction.options.getString("item", true);
  const item = await getShopService().getShopItem(interaction.guildId, itemId, {
    includeDisabled: true,
  });

  if (!item) {
    await replyWithError(interaction, "Cet objet est introuvable.");
    return null;
  }

  return item;
}

function getItemCreateValues(interaction) {
  const stock = interaction.options.getInteger("stock");

  return {
    category: interaction.options.getString("category") || getShopService().DEFAULT_CATEGORY,
    description: interaction.options.getString("description", true).trim(),
    emoji: interaction.options.getString("emoji")?.trim() || "",
    maxPerCharacter: interaction.options.getInteger("max_per_character"),
    name: interaction.options.getString("name", true).trim(),
    price: interaction.options.getInteger("price", true),
    stock,
  };
}

function getItemEditValues(interaction) {
  const data = {};
  const name = interaction.options.getString("name");
  const description = interaction.options.getString("description");
  const price = interaction.options.getInteger("price");
  const category = interaction.options.getString("category");
  const emoji = interaction.options.getString("emoji");
  const stock = interaction.options.getInteger("stock");
  const maxPerCharacter = interaction.options.getInteger("max_per_character");

  if (name !== null) {
    data.name = name.trim();
  }

  if (description !== null) {
    data.description = description.trim();
  }

  if (price !== null) {
    data.price = price;
  }

  if (category !== null) {
    data.category = category;
  }

  if (emoji !== null) {
    data.emoji = emoji.trim();
  }

  if (stock !== null) {
    data.stock = stock;
    data.isLimited = true;
  }

  if (maxPerCharacter !== null) {
    data.maxPerCharacter = maxPerCharacter;
  }

  return data;
}

module.exports = {
  handleItemConfig,
};
