const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorSpacingSize,
} = require("discord.js");
const crypto = require("crypto");

const {
  BUTTON_CONTEXT_TTL_MS,
  BUY_BUTTON_PREFIX,
  ITEM_COLOR,
  ITEMS_PER_PAGE,
  PAGE_BUTTON_PREFIX,
} = require("./constants");
const {
  formatCurrency,
  formatShopItem,
  getShopService,
  isItemSoldOut,
  truncateButtonLabel,
} = require("./shared");

const buttonContexts = new Map();

function createShopPayload(context) {
  const pageItems = getPageItems(context);
  const contextToken = pageItems.length > 0 ? createButtonContext(context, pageItems) : null;

  return {
    components: createShopComponents(context, pageItems, contextToken),
    flags: MessageFlags.IsComponentsV2,
  };
}

function createShopComponents(context, pageItems, contextToken) {
  const components = [createShopContainer(context, pageItems, contextToken)];

  if (contextToken && context.pageCount > 1) {
    components.push(createNavigationRow(context, contextToken));
  }

  return components;
}

function createShopContainer(context, pageItems, contextToken) {
  const categoryLabel = context.category
    ? getShopService().getCategoryLabel(context.category)
    : "Toutes les catégories";

  const container = new ContainerBuilder()
    .setAccentColor(ITEM_COLOR)
    .addTextDisplayComponents((text) => text.setContent([
      "### \\🏪 Magasin",
      "Clique sur un bouton à droite pour acheter instantanément un objet.",
      `**Personnage** | ${context.character.name}`,
      `**Catégorie** | ${categoryLabel}`,
    ].join("\n")))
    .addSeparatorComponents((separator) =>
      separator
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    );

  if (pageItems.length === 0) {
    container.addTextDisplayComponents((text) =>
      text.setContent("Aucun objet n'est disponible dans ce magasin pour le moment."),
    );
  } else {
    pageItems.forEach((item, index) => {
      container.addSectionComponents(createShopItemSection(item, context.settings, contextToken, index));

      if (index < pageItems.length - 1) {
        container.addSeparatorComponents((separator) =>
          separator
            .setDivider(true)
            .setSpacing(SeparatorSpacingSize.Small),
        );
      }
    });
  }

  container
    .addSeparatorComponents((separator) =>
      separator
        .setDivider(true)
        .setSpacing(SeparatorSpacingSize.Small),
    )
    .addTextDisplayComponents((text) => text.setContent(`Page ${context.page + 1}/${context.pageCount}`));

  return container;
}

function createShopItemSection(item, settings, contextToken, index) {
  const buttonLabel = isItemSoldOut(item) ? "Épuisé" : formatCurrency(item.price, settings);
  const button = new ButtonBuilder()
    .setCustomId(`${BUY_BUTTON_PREFIX}${contextToken}:${index}`)
    .setLabel(truncateButtonLabel(buttonLabel))
    .setStyle(ButtonStyle.Success)
    .setDisabled(isItemSoldOut(item))
    .setEmoji({ name: "💴" });

  return new SectionBuilder()
    .addTextDisplayComponents((text) => text.setContent(formatShopItem(item, settings)))
    .setButtonAccessory(button);
}

function createNavigationRow(context, contextToken) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PAGE_BUTTON_PREFIX}${contextToken}:previous`)
      .setLabel("Page précédente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(context.page <= 0),
    new ButtonBuilder()
      .setCustomId(`${PAGE_BUTTON_PREFIX}${contextToken}:next`)
      .setLabel("Page suivante")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(context.page >= context.pageCount - 1),
  );
}

function getPageItems(context) {
  const startIndex = context.page * ITEMS_PER_PAGE;

  return context.items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}

function createButtonContext(context, pageItems) {
  cleanupExpiredButtonContexts();

  const contextToken = crypto.randomBytes(6).toString("hex");

  buttonContexts.set(contextToken, {
    category: context.category,
    characterId: context.character.id,
    expiresAt: Date.now() + BUTTON_CONTEXT_TTL_MS,
    guildId: context.guildId,
    itemIds: pageItems.map((item) => item.id),
    ownerId: context.ownerId,
    page: context.page,
  });

  return contextToken;
}

function getButtonContext(contextToken) {
  cleanupExpiredButtonContexts();

  const buttonContext = buttonContexts.get(contextToken);

  if (!buttonContext || buttonContext.expiresAt <= Date.now()) {
    buttonContexts.delete(contextToken);
    return null;
  }

  return buttonContext;
}

function cleanupExpiredButtonContexts() {
  const now = Date.now();

  for (const [contextToken, buttonContext] of buttonContexts.entries()) {
    if (buttonContext.expiresAt <= now) {
      buttonContexts.delete(contextToken);
    }
  }
}

function canUseButton(interaction, buttonContext) {
  return buttonContext.ownerId === interaction.user.id && buttonContext.guildId === interaction.guildId;
}

function parsePageButtonId(customId) {
  const [contextToken, action] = customId.slice(PAGE_BUTTON_PREFIX.length).split(":");

  return {
    action,
    contextToken,
  };
}

function parseBuyButtonId(customId) {
  const [contextToken, itemIndex] = customId.slice(BUY_BUTTON_PREFIX.length).split(":");

  return {
    contextToken,
    itemIndex: Number(itemIndex),
  };
}

module.exports = {
  canUseButton,
  createShopPayload,
  getButtonContext,
  parseBuyButtonId,
  parsePageButtonId,
};
