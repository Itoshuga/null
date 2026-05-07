const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} = require("discord.js");
const crypto = require("crypto");

const ECONOMY_COLOR = 0xf2f4f8;
const ECONOMY_COMPONENT_PREFIX = "economy:";
const TRANSACTIONS_BUTTON_PREFIX = `${ECONOMY_COMPONENT_PREFIX}tx:`;
const BUTTON_CONTEXT_TTL_MS = 15 * 60 * 1000;
const MAX_STANDARD_AMOUNT = 1_000_000;
const MAX_PAYMENT_AMOUNT = 100_000;
const TRANSACTIONS_LIMIT = 10;
const buttonContexts = new Map();

const WORK_MESSAGES = [
  "[characterName] a fait de la manutention en intérim et gagne [money].",
  "[characterName] a livré des colis toute la journée et gagne [money].",
  "[characterName] a aidé à décharger un camion et repart avec [money].",
  "[characterName] a nettoyé un entrepôt et gagne [money].",
  "[characterName] a travaillé sur un chantier et reçoit [money].",
  "[characterName] a fait quelques heures comme serveur et gagne [money].",
  "[characterName] a remplacé un employé absent au dernier moment et empoche [money].",
  "[characterName] a distribué des flyers en ville et gagne [money].",
  "[characterName] a fait du ménage dans des bureaux et reçoit [money].",
  "[characterName] a aidé un commerçant à ranger sa réserve et gagne [money].",
  "[characterName] a gardé l'entrée d'un événement privé et repart avec [money].",
  "[characterName] a fait des livraisons à vélo et gagne [money].",
  "[characterName] a travaillé comme plongeur dans un restaurant et reçoit [money].",
  "[characterName] a monté des meubles pour un particulier et gagne [money].",
  "[characterName] a aidé à préparer une salle pour un événement et empoche [money].",
  "[characterName] a fait l'inventaire dans un magasin et gagne [money].",
  "[characterName] a lavé des voitures toute l'après-midi et reçoit [money].",
  "[characterName] a réparé quelques bricoles chez un voisin et gagne [money].",
  "[characterName] a porté des cartons pendant des heures et repart avec [money].",
  "[characterName] a aidé au déménagement d'un client et gagne [money].",
  "[characterName] a travaillé dans une supérette pour la journée et reçoit [money].",
  "[characterName] a rangé des rayons dans un magasin et gagne [money].",
  "[characterName] a préparé des commandes dans un entrepôt et empoche [money].",
  "[characterName] a fait la plonge après un gros service et gagne [money].",
  "[characterName] a gardé des enfants quelques heures et reçoit [money].",
  "[characterName] a promené des chiens dans le quartier et gagne [money].",
  "[characterName] a arrosé les plantes d'un voisin absent et repart avec [money].",
  "[characterName] a aidé un artisan sur un petit chantier et gagne [money].",
  "[characterName] a trié des colis dans un dépôt et reçoit [money].",
  "[characterName] a fait du soutien scolaire et gagne [money].",
];

module.exports = {
  name: "economy",
  description: "Gère l'économie roleplay des personnages.",
  category: "Roleplay",
  usage: "/economy <work|balance|deposit|withdraw|payment|transactions>",
  componentPrefix: ECONOMY_COMPONENT_PREFIX,
  data: new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Gère l'économie roleplay des personnages.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("work")
        .setDescription("Fait travailler un personnage.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage qui travaille.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("balance")
        .setDescription("Affiche le solde complet d'un personnage.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à consulter.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deposit")
        .setDescription("Dépose de l'argent en banque.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage concerné.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Montant à déposer.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(MAX_STANDARD_AMOUNT),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("withdraw")
        .setDescription("Retire de l'argent de la banque.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage concerné.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Montant à retirer.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(MAX_STANDARD_AMOUNT),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("payment")
        .setDescription("Envoie de l'argent à un autre personnage.")
        .addStringOption((option) =>
          option
            .setName("from_character")
            .setDescription("Ton personnage qui envoie l'argent.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("to_character")
            .setDescription("Personnage qui reçoit l'argent.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Montant envoyé.")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(MAX_PAYMENT_AMOUNT),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Raison du paiement.")
            .setRequired(false)
            .setMaxLength(200),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("transactions")
        .setDescription("Affiche les transactions récentes d'un personnage.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage concerné.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "Cette commande doit être utilisée dans un serveur Discord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const subcommand = interaction.options.getSubcommand();

      await interaction.deferReply(getReplyOptions(subcommand));

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
    } catch (error) {
      if (error.name === "EconomyError") {
        await replyWithEconomyError(interaction, error);
        return;
      }

      throw error;
    }
  },

  async autocomplete(interaction) {
    if (!interaction.guildId) {
      await interaction.respond([]);
      return;
    }

    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === "to_character") {
      await autocompleteAllCharacters(interaction, focusedOption.value);
      return;
    }

    if (["character", "from_character"].includes(focusedOption.name)) {
      await autocompleteOwnedCharacters(interaction, focusedOption.value);
      return;
    }

    await interaction.respond([]);
  },

  async handleButton(interaction) {
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
  },
};

function getCharacterService() {
  return require("../../services/characterService");
}

function getEconomyService() {
  return require("../../services/economyService");
}

function getReplyOptions(subcommand) {
  if (["work", "payment"].includes(subcommand)) {
    return {};
  }

  return {
    flags: MessageFlags.Ephemeral,
  };
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
  const transactions = await getEconomyService().listTransactions(interaction.guildId, context.character.id, TRANSACTIONS_LIMIT);

  await interaction.editReply({
    embeds: [createTransactionsEmbed(context, transactions)],
  });
}

async function getOwnedEconomyContext(interaction, characterId) {
  const [settings, character] = await Promise.all([
    getEconomyService().getEconomySettings(interaction.guildId),
    getCharacterService().getCharacter(interaction.guildId, characterId),
  ]);

  if (!character || character.isActive === false) {
    throw new (getEconomyService().EconomyError)("character_not_found", "Ce personnage est introuvable ou inactif.");
  }

  if (character.ownerId !== interaction.user.id) {
    throw new (getEconomyService().EconomyError)("not_owner", "Tu ne peux consulter que tes propres personnages.");
  }

  return {
    character,
    economy: getEconomyService().normalizeEconomy(character.economy, settings),
    settings,
  };
}

async function autocompleteOwnedCharacters(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characters = await getCharacterService().listCharactersByOwner(interaction.guildId, interaction.user.id);
  const choices = createCharacterChoices(characters, normalizedValue);

  await interaction.respond(choices);
}

async function autocompleteAllCharacters(interaction, focusedValue) {
  const normalizedValue = normalizeSearchText(focusedValue || "");
  const characters = await getCharacterService().listCharacters(interaction.guildId);
  const choices = createCharacterChoices(characters, normalizedValue);

  await interaction.respond(choices);
}

function createCharacterChoices(characters, normalizedValue) {
  return characters
    .filter((character) => {
      const searchableText = normalizeSearchText(`${character.name} ${character.id} ${character.proxy}`);

      return character.isActive !== false && searchableText.includes(normalizedValue);
    })
    .slice(0, 25)
    .map((character) => ({
      name: truncateChoiceName(character.name),
      value: character.id,
    }));
}

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
    .setDescription(lines.join("\n"))
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
    return {
      label: "Travail",
      sign: "+",
      symbol: "+",
    };
  }

  if (transaction.type === "deposit") {
    return {
      label: "Dépôt banque",
      sign: "-",
      symbol: "↘",
    };
  }

  if (transaction.type === "withdraw") {
    return {
      label: "Retrait banque",
      sign: "+",
      symbol: "↗",
    };
  }

  if (transaction.type === "payment" && transaction.fromCharacterId === characterId) {
    return {
      label: "Paiement envoyé",
      sign: "-",
      symbol: "→",
    };
  }

  if (transaction.type === "payment" && transaction.toCharacterId === characterId) {
    return {
      label: "Paiement reçu",
      sign: "+",
      symbol: "←",
    };
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

function formatCurrency(amount, settings) {
  const formattedAmount = new Intl.NumberFormat("fr-FR").format(amount);

  return `${formattedAmount} ${settings.currencySymbol}`;
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

function formatDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.ceil(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours > 1 ? "heures" : "heure"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes > 1 ? "minutes" : "minute"}`);
  }

  return parts.join(" ");
}

function truncatePlainText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return value.slice(0, maxLength - 1);
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

function normalizeSearchText(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function truncateChoiceName(value) {
  return truncateText(value, 100);
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
