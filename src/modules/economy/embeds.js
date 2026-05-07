const { EmbedBuilder } = require("discord.js");

const {
  ECONOMY_COLOR,
  WORK_MESSAGES,
} = require("./constants");
const {
  formatCurrency,
} = require("./shared");

function createWorkEmbed(result) {
  return createEconomyEmbed([
    "### \\💼 **Travail terminé**",
    createRandomWorkMessage(result),
  ]);
}

function createRandomWorkMessage(result) {
  const messageTemplate = WORK_MESSAGES[Math.floor(Math.random() * WORK_MESSAGES.length)];

  return messageTemplate
    .replace("[characterName]", `**${result.character.name}**`)
    .replace("[money]", `**${formatCurrency(result.amount, result.settings)}**`);
}

function createBalanceEmbed(context) {
  return createEconomyEmbed([
    `### \\🏦 **Compte bancaire — ${context.character.name}**`,
    "",
    `**Titulaire** | ${context.character.name}`,
    `**Compte** | \`${createAccountNumber(context.character)}\``,
    "**Type** | Personnel",
    `**Devise** | \`${context.settings.currencySymbol}\``,
    `**Statut** | **\`${context.character.isActive === false ? "🔴 Inactif" : "🟢 Actif"}\`**`,
    "",
    "💵 **Argent sur soi**",
    `**\`${formatCurrency(context.economy.wallet, context.settings)}\`**`,
    "",
    "🏦 **Solde bancaire**",
    `**\`${formatCurrency(context.economy.bank, context.settings)}\`**`,
    "",
    "💰 **Patrimoine total**",
    `**\`${formatCurrency(getTotalMoney(context.economy), context.settings)}\`**`,
  ]);
}

function createDepositEmbed(result) {
  return createEconomyEmbed([
    "### \\🏦 **Dépôt effectué**",
    `**${result.character.name}** a déposé **${formatCurrency(result.amount, result.settings)}** en banque.`,
  ]);
}

function createWithdrawEmbed(result) {
  return createEconomyEmbed([
    "### \\💸 **Retrait effectué**",
    `**${result.character.name}** a retiré **${formatCurrency(result.amount, result.settings)}** de sa banque.`,
  ]);
}

function createPaymentEmbed(result) {
  return createEconomyEmbed([
    "### \\💸 **Paiement effectué**",
    `**${result.fromCharacter.name}** a envoyé **${formatCurrency(result.amount, result.settings)}** à **${result.toCharacter.name}**.`,
    result.reason ? "" : null,
    result.reason ? `**Raison** | ${result.reason}` : null,
  ].filter(Boolean));
}

function createTransactionsEmbed(context, transactions) {
  const transactionLines = transactions.map((transaction) => formatTransactionLine(
    transaction,
    context.character.id,
    context.settings,
  ));
  const transactionsBlock = transactionLines.length > 0
    ? ["```txt", ...transactionLines, "```"].join("\n")
    : "Aucune transaction récente.";

  return createEconomyEmbed([
    `### \\📜 **Relevé de compte — ${context.character.name}**`,
    transactionsBlock,
  ]);
}

function createEconomyEmbed(lines) {
  return new EmbedBuilder()
    .setColor(ECONOMY_COLOR)
    .setDescription(lines.join("\n"));
}

function createAccountNumber(character) {
  const normalizedId = character.id
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  const accountSuffix = normalizedId.slice(0, 8).padEnd(8, "0");

  return `RP-${accountSuffix}`;
}

function formatTransactionLine(transaction, characterId, settings) {
  const display = getTransactionDisplay(transaction, characterId);
  const date = formatTransactionDate(transaction.createdAt);
  const label = truncatePlainText(display.label, 18).padEnd(18, " ");
  const amount = formatSignedCurrency(transaction.amount, display.sign, settings).padStart(12, " ");

  return `${date}  ${display.symbol} ${label}${amount}`;
}

function getTransactionDisplay(transaction, characterId) {
  if (transaction.type === "work") {
    return { label: "Travail", sign: "+", symbol: "+" };
  }

  if (transaction.type === "deposit") {
    return { label: "Dépôt banque", sign: "-", symbol: "↘" };
  }

  if (transaction.type === "withdraw") {
    return { label: "Retrait banque", sign: "+", symbol: "↗" };
  }

  if (transaction.type === "payment" && transaction.fromCharacterId === characterId) {
    return { label: "Paiement envoyé", sign: "-", symbol: "→" };
  }

  if (transaction.type === "payment" && transaction.toCharacterId === characterId) {
    return { label: "Paiement reçu", sign: "+", symbol: "←" };
  }

  if (transaction.type === "shop_purchase") {
    return { label: "Achat boutique", sign: "-", symbol: "×" };
  }

  if (transaction.type === "shop_sale") {
    return { label: "Vente boutique", sign: "+", symbol: "↗" };
  }

  if (transaction.type === "admin_add") {
    return { label: "Ajout staff", sign: "+", symbol: "+" };
  }

  if (transaction.type === "admin_remove") {
    return { label: "Retrait staff", sign: "-", symbol: "-" };
  }

  return {
    label: transaction.type,
    sign: "",
    symbol: "•",
  };
}

function getTotalMoney(economy) {
  return economy.wallet + economy.bank;
}

function formatSignedCurrency(amount, sign, settings) {
  return `${sign}${new Intl.NumberFormat("fr-FR").format(amount)} ${settings.currencySymbol}`;
}

function formatTransactionDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--/-- --:--";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month} ${hours}:${minutes}`;
}

function truncatePlainText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength - 1);
}

module.exports = {
  createBalanceEmbed,
  createDepositEmbed,
  createPaymentEmbed,
  createTransactionsEmbed,
  createWithdrawEmbed,
  createWorkEmbed,
};
