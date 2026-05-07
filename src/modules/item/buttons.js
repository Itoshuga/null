const { MessageFlags } = require("discord.js");

const {
  BUY_BUTTON_PREFIX,
  PAGE_BUTTON_PREFIX,
} = require("./constants");
const {
  createPurchaseEmbed,
} = require("./embeds");
const {
  getShopContext,
} = require("./handlers");
const {
  getShopService,
} = require("./shared");
const {
  canUseButton,
  createShopPayload,
  getButtonContext,
  parseBuyButtonId,
  parsePageButtonId,
} = require("./shopView");

async function handleItemButton(interaction) {
  if (interaction.customId.startsWith(PAGE_BUTTON_PREFIX)) {
    await handlePageButton(interaction);
    return;
  }

  if (interaction.customId.startsWith(BUY_BUTTON_PREFIX)) {
    await handleBuyButton(interaction);
    return;
  }

  await interaction.reply({
    content: "Ce bouton n'est plus disponible pour le moment.",
    flags: MessageFlags.Ephemeral,
  });
}

async function handlePageButton(interaction) {
  const { contextToken, action } = parsePageButtonId(interaction.customId);
  const buttonContext = getButtonContext(contextToken);

  if (!buttonContext) {
    await replyExpiredButton(interaction);
    return;
  }

  if (!canUseButton(interaction, buttonContext)) {
    await replyForbiddenButton(interaction);
    return;
  }

  const nextPage = action === "next" ? buttonContext.page + 1 : buttonContext.page - 1;

  try {
    const context = await getShopContext(interaction, buttonContext.characterId, buttonContext.category, nextPage);

    await interaction.update(createShopPayload(context));
  } catch (error) {
    if (error.name === "ShopError") {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    throw error;
  }
}

async function handleBuyButton(interaction) {
  const { contextToken, itemIndex } = parseBuyButtonId(interaction.customId);
  const buttonContext = getButtonContext(contextToken);

  if (!buttonContext) {
    await replyExpiredButton(interaction);
    return;
  }

  if (!canUseButton(interaction, buttonContext)) {
    await replyForbiddenButton(interaction);
    return;
  }

  const itemId = buttonContext.itemIds[itemIndex];

  if (!itemId) {
    await interaction.reply({
      content: "Cet objet n'est plus disponible sur cette page.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const result = await getShopService().purchaseItem(
      interaction.guildId,
      buttonContext.characterId,
      itemId,
      interaction.user.id,
    );

    await interaction.reply({
      embeds: [createPurchaseEmbed(result)],
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (error.name === "ShopError") {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    throw error;
  }
}

async function replyExpiredButton(interaction) {
  await interaction.reply({
    content: "Ce magasin a expiré. Relance `/item shop` pour afficher un magasin à jour.",
    flags: MessageFlags.Ephemeral,
  });
}

async function replyForbiddenButton(interaction) {
  await interaction.reply({
    content: "Seul le joueur qui a ouvert ce magasin peut utiliser ces boutons.",
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  handleItemButton,
};
