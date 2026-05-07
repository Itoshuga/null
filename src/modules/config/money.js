const {
  formatCurrency,
  getEconomyService,
  replyWithEmbed,
} = require("./shared");

async function handleMoneyConfig(interaction, subcommand) {
  if (subcommand === "give") {
    await handleMoneyGive(interaction);
    return;
  }

  if (subcommand === "remove") {
    await handleMoneyRemove(interaction);
  }
}

async function handleMoneyGive(interaction) {
  const characterId = interaction.options.getString("character", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason");
  const result = await getEconomyService().adminGive(
    interaction.guildId,
    characterId,
    interaction.user.id,
    amount,
    reason,
  );

  await replyWithEmbed(interaction, [
    "### \\💰 **Argent ajouté**",
    `**${result.character.name}** reçoit **\`${formatCurrency(result.amount, result.settings)}\`**.`,
    `Solde sur soi : **\`${formatCurrency(result.economy.wallet, result.settings)}\`**`,
    reason ? `Raison : ${reason}` : null,
  ].filter(Boolean).join("\n"));
}

async function handleMoneyRemove(interaction) {
  const characterId = interaction.options.getString("character", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason");
  const result = await getEconomyService().adminRemove(
    interaction.guildId,
    characterId,
    interaction.user.id,
    amount,
    reason,
  );

  await replyWithEmbed(interaction, [
    "### \\💸 **Argent retiré**",
    `**${result.character.name}** perd **\`${formatCurrency(result.amount, result.settings)}\`**.`,
    `Solde sur soi : **\`${formatCurrency(result.economy.wallet, result.settings)}\`**`,
    reason ? `Raison : ${reason}` : null,
  ].filter(Boolean).join("\n"));
}

module.exports = {
  handleMoneyConfig,
};
