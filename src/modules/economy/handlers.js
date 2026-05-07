const { MessageFlags } = require("discord.js");

const {
  TRANSACTIONS_LIMIT,
} = require("./constants");
const {
  createTransactionsButtonRow,
} = require("./buttons");
const {
  createBalanceEmbed,
  createDepositEmbed,
  createPaymentEmbed,
  createTransactionsEmbed,
  createWithdrawEmbed,
  createWorkEmbed,
} = require("./embeds");
const {
  formatDuration,
  getEconomyService,
  getOwnedEconomyContext,
} = require("./shared");

function getReplyOptions(subcommand) {
  if (["work", "payment"].includes(subcommand)) {
    return {};
  }

  return {
    flags: MessageFlags.Ephemeral,
  };
}

async function handleEconomyCommand(interaction, subcommand) {
  if (subcommand === "work") {
    await handleWork(interaction);
    return;
  }

  if (subcommand === "balance") {
    await handleBalance(interaction);
    return;
  }

  if (subcommand === "deposit") {
    await handleDeposit(interaction);
    return;
  }

  if (subcommand === "withdraw") {
    await handleWithdraw(interaction);
    return;
  }

  if (subcommand === "payment") {
    await handlePayment(interaction);
    return;
  }

  if (subcommand === "transactions") {
    await handleTransactions(interaction);
  }
}

async function handleWork(interaction) {
  const characterId = interaction.options.getString("character", true);
  const result = await getEconomyService().work(interaction.guildId, characterId, interaction.user.id);

  await interaction.editReply({
    embeds: [createWorkEmbed(result)],
  });
}

async function handleBalance(interaction) {
  const context = await getOwnedEconomyContext(interaction, interaction.options.getString("character", true));

  await interaction.editReply({
    embeds: [createBalanceEmbed(context)],
    components: [createTransactionsButtonRow(context)],
  });
}

async function handleDeposit(interaction) {
  const characterId = interaction.options.getString("character", true);
  const amount = interaction.options.getInteger("amount", true);
  const result = await getEconomyService().deposit(interaction.guildId, characterId, interaction.user.id, amount);

  await interaction.editReply({
    embeds: [createDepositEmbed(result)],
  });
}

async function handleWithdraw(interaction) {
  const characterId = interaction.options.getString("character", true);
  const amount = interaction.options.getInteger("amount", true);
  const result = await getEconomyService().withdraw(interaction.guildId, characterId, interaction.user.id, amount);

  await interaction.editReply({
    embeds: [createWithdrawEmbed(result)],
  });
}

async function handlePayment(interaction) {
  const fromCharacterId = interaction.options.getString("from_character", true);
  const toCharacterId = interaction.options.getString("to_character", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason");
  const result = await getEconomyService().payment(
    interaction.guildId,
    fromCharacterId,
    toCharacterId,
    interaction.user.id,
    amount,
    reason,
  );

  await interaction.editReply({
    embeds: [createPaymentEmbed(result)],
  });
}

async function handleTransactions(interaction) {
  const context = await getOwnedEconomyContext(interaction, interaction.options.getString("character", true));
  const transactions = await getEconomyService().listTransactions(
    interaction.guildId,
    context.character.id,
    TRANSACTIONS_LIMIT,
  );

  await interaction.editReply({
    embeds: [createTransactionsEmbed(context, transactions)],
  });
}

async function replyWithEconomyError(interaction, error) {
  const message = error.code === "work_cooldown"
    ? `${error.message}\nTemps restant : ${formatDuration(error.details.remainingMs)}.`
    : error.message;

  await interaction.editReply({
    content: message,
    embeds: [],
  });
}

module.exports = {
  getReplyOptions,
  handleEconomyCommand,
  replyWithEconomyError,
};
