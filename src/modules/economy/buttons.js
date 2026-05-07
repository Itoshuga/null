const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const crypto = require("crypto");

const {
  BUTTON_CONTEXT_TTL_MS,
  TRANSACTIONS_BUTTON_PREFIX,
  TRANSACTIONS_LIMIT,
} = require("./constants");
const {
  getEconomyService,
  getOwnedEconomyContext,
} = require("./shared");
const {
  createTransactionsEmbed,
} = require("./embeds");

const buttonContexts = new Map();

function createTransactionsButtonRow(context) {
  const contextToken = createButtonContext(context);

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${TRANSACTIONS_BUTTON_PREFIX}${contextToken}`)
      .setEmoji("📜")
      .setLabel("Liste des Transactions")
      .setStyle(ButtonStyle.Secondary),
  );
}

async function handleEconomyButton(interaction) {
  if (!interaction.customId.startsWith(TRANSACTIONS_BUTTON_PREFIX)) {
    await interaction.reply({
      content: "Ce bouton n'est plus disponible pour le moment.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const contextToken = interaction.customId.slice(TRANSACTIONS_BUTTON_PREFIX.length);
  const buttonContext = getButtonContext(contextToken);

  if (!buttonContext) {
    await interaction.reply({
      content: "Ce bouton a expiré. Relance `/economy balance` pour générer un nouvel accès rapide.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (buttonContext.ownerId !== interaction.user.id) {
    await interaction.reply({
      content: "Seul le propriétaire du compte peut consulter cet historique.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const context = await getOwnedEconomyContext(interaction, buttonContext.characterId);
    const transactions = await getEconomyService().listTransactions(
      interaction.guildId,
      context.character.id,
      TRANSACTIONS_LIMIT,
    );

    await interaction.update({
      embeds: [createTransactionsEmbed(context, transactions)],
      components: [],
    });
  } catch (error) {
    if (error.name === "EconomyError") {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    throw error;
  }
}

function createButtonContext(context) {
  cleanupExpiredButtonContexts();

  const contextToken = crypto.randomBytes(6).toString("hex");

  buttonContexts.set(contextToken, {
    characterId: context.character.id,
    expiresAt: Date.now() + BUTTON_CONTEXT_TTL_MS,
    ownerId: context.character.ownerId,
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

module.exports = {
  createTransactionsButtonRow,
  handleEconomyButton,
};
