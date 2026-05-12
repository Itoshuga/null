const {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const {
  getEconomyService,
  replyWithEmbed,
  replyWithError,
} = require("./shared");

const CONFIG_COMPONENT_PREFIX = "config:";
const CONFIG_ECONOMY_DEVISE_MODAL_PREFIX = `${CONFIG_COMPONENT_PREFIX}economy:devise`;
const DEFAULT_CURRENCY_SYMBOL = "¥";
const MAX_CURRENCY_SYMBOL_LENGTH = 8;

async function handleEconomyConfig(interaction, subcommand) {
  if (subcommand === "devise") {
    await showCurrencyModal(interaction);
  }
}

async function handleEconomyConfigModalSubmit(interaction) {
  if (!interaction.customId.startsWith(CONFIG_ECONOMY_DEVISE_MODAL_PREFIX)) {
    await replyWithModalError(interaction, "Ce formulaire n'est plus disponible pour le moment.");
    return;
  }

  if (!interaction.guildId) {
    await replyWithModalError(interaction, "Cette configuration doit être utilisée dans un serveur Discord.");
    return;
  }

  const [, , , userId] = interaction.customId.split(":");

  if (userId !== interaction.user.id) {
    await replyWithModalError(interaction, "Ce formulaire ne t'appartient pas.");
    return;
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await replyWithModalError(interaction, "Tu dois avoir la permission Gérer le serveur pour modifier la devise.");
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const currencySymbol = interaction.fields.getTextInputValue("currency_symbol").trim();
  const validationError = validateCurrencySymbol(currencySymbol);

  if (validationError) {
    await replyWithError(interaction, validationError);
    return;
  }

  const settings = await getEconomyService().updateCurrencySymbol(
    interaction.guildId,
    currencySymbol,
    interaction.user.id,
  );

  await replyWithEmbed(interaction, [
    "### \\💱 **Devise modifiée**",
    `La devise du serveur est maintenant : **\`${settings.currencySymbol}\`**`,
    "Les commandes d'économie, d'objets et de personnages utiliseront cette devise.",
  ].join("\n"));
}

async function showCurrencyModal(interaction) {
  const settings = await getEconomyService().getEconomySettings(interaction.guildId);
  const modal = new ModalBuilder()
    .setCustomId(`${CONFIG_ECONOMY_DEVISE_MODAL_PREFIX}:${interaction.user.id}`)
    .setTitle("Configuration de la devise")
    .addLabelComponents(
      new LabelBuilder()
        .setLabel("Devise")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId("currency_symbol")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(MAX_CURRENCY_SYMBOL_LENGTH)
            .setValue(getModalCurrencyValue(settings.currencySymbol)),
        ),
    );

  await interaction.showModal(modal);
}

function getModalCurrencyValue(currencySymbol) {
  return (currencySymbol || DEFAULT_CURRENCY_SYMBOL).slice(0, MAX_CURRENCY_SYMBOL_LENGTH);
}

function validateCurrencySymbol(currencySymbol) {
  if (!currencySymbol) {
    return "La devise ne peut pas être vide.";
  }

  if (currencySymbol.length > MAX_CURRENCY_SYMBOL_LENGTH) {
    return `La devise ne peut pas dépasser ${MAX_CURRENCY_SYMBOL_LENGTH} caractères.`;
  }

  return null;
}

async function replyWithModalError(interaction, message) {
  await interaction.reply({
    content: message,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  CONFIG_COMPONENT_PREFIX,
  handleEconomyConfig,
  handleEconomyConfigModalSubmit,
};
