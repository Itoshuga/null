const {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const HELP_CATEGORY_MENU_PREFIX = "help:category";
const HELP_COLOR = 0x3498db;

module.exports = {
  name: "help",
  description: "Affiche le centre d'aide du bot.",
  category: "Utilitaires",
  usage: "/help [commande]",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche le centre d'aide du bot.")
    .addStringOption((option) =>
      option
        .setName("commande")
        .setDescription("Nom de la commande à consulter.")
        .setRequired(false)
        .setAutocomplete(true),
    ),
  isEnabled: true,
  isDeployed: true,

  componentPrefix: HELP_CATEGORY_MENU_PREFIX,

  async execute(interaction, client) {
    const requestedCommandName = interaction.options.getString("commande");

    if (requestedCommandName) {
      const command = findCommand(client, requestedCommandName);
      const embed = command
        ? createCommandHelpEmbed(command)
        : createUnknownCommandEmbed(requestedCommandName);

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [createGeneralHelpEmbed(client)],
      components: createCategorySelectMenu(client, interaction.user.id),
      flags: MessageFlags.Ephemeral,
    });
  },

  async autocomplete(interaction, client) {
    const focusedValue = normalizeCommandName(interaction.options.getFocused() || "");
    const choices = getAutocompleteChoices(client, focusedValue);

    await interaction.respond(choices);
  },

  async handleSelectMenu(interaction, client) {
    const [, , ownerId] = interaction.customId.split(":");

    if (ownerId !== interaction.user.id) {
      await interaction.reply({
        content: "Ce menu d'aide ne t'est pas destiné.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectedCategory = interaction.values[0];
    const commands = getCommandsByCategory(client, selectedCategory);

    await interaction.update({
      embeds: [createCategoryHelpEmbed(selectedCategory, commands)],
      components: createCategorySelectMenu(client, interaction.user.id),
    });
  },
};

function getCommandPayload(command) {
  return command.data.toJSON();
}

function normalizeCommandName(commandName) {
  return commandName.trim().replace(/^\//, "").toLowerCase();
}

function sortByName(commands) {
  return [...commands].sort((firstCommand, secondCommand) =>
    firstCommand.name.localeCompare(secondCommand.name, "fr"),
  );
}

function getAvailableCommands(client) {
  return sortByName(
    [...client.commands.values()].filter((command) => command.isEnabled && command.isDeployed),
  );
}

function getSearchableCommands(client) {
  return sortByName([...client.commands.values()]);
}

function getCategories(commands) {
  const categories = commands.map((command) => command.category);
  const uniqueCategories = [...new Set(categories)];

  return uniqueCategories.sort((firstCategory, secondCategory) =>
    firstCategory.localeCompare(secondCategory, "fr"),
  );
}

function getCommandsByCategory(client, category) {
  return getAvailableCommands(client).filter((command) => command.category === category);
}

function getCommandStatus(command) {
  if (!command.isDeployed) {
    return "Non déployée";
  }

  if (!command.isEnabled) {
    return "En maintenance";
  }

  return "Disponible";
}

function getOptionTypeLabel(type) {
  const optionTypes = {
    3: "texte",
    4: "nombre entier",
    5: "booléen",
    6: "utilisateur",
    7: "salon",
    8: "rôle",
    9: "mentionnable",
    10: "nombre",
    11: "fichier",
  };

  return optionTypes[type] || "option";
}

function formatOptions(command) {
  const payload = getCommandPayload(command);

  if (!payload.options || payload.options.length === 0) {
    return "Aucune option.";
  }

  return payload.options
    .map((option) => {
      const requiredLabel = option.required ? "obligatoire" : "facultative";
      const typeLabel = getOptionTypeLabel(option.type);

      return `\`${option.name}\` (${typeLabel}, ${requiredLabel}) - ${option.description}`;
    })
    .join("\n");
}

function createGeneralHelpEmbed(client) {
  const availableCommands = getAvailableCommands(client);
  const categoryCount = getCategories(availableCommands).length;

  return new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle("📘 Centre d'aide")
    .setDescription(
      [
        "Bienvenue dans le menu d'aide du bot.",
        "Sélectionne une catégorie dans le menu ci-dessous pour voir les commandes associées.",
      ].join("\n"),
    )
    .addFields({
      name: "Commandes disponibles",
      value: `${availableCommands.length} commande${availableCommands.length > 1 ? "s" : ""} dans ${categoryCount} catégorie${categoryCount > 1 ? "s" : ""}.`,
    });
}

function createCommandHelpEmbed(command) {
  return new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle(`📘 Aide de la commande /${command.name}`)
    .addFields(
      {
        name: "Catégorie",
        value: command.category,
        inline: true,
      },
      {
        name: "Statut",
        value: getCommandStatus(command),
        inline: true,
      },
      {
        name: "Description",
        value: command.description,
      },
      {
        name: "Utilisation",
        value: `\`${command.usage}\``,
      },
      {
        name: "Options",
        value: formatOptions(command),
      },
    );
}

function createCategoryHelpEmbed(category, commands) {
  const commandList = commands
    .map((command) => `\`/${command.name}\` - ${command.description}`)
    .join("\n");

  return new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle(`📘 Commandes ${category}`)
    .setDescription(commandList || "Aucune commande disponible dans cette catégorie.");
}

function createUnknownCommandEmbed(commandName) {
  return new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("Commande introuvable")
    .setDescription(`La commande \`/${commandName}\` n'existe pas ou n'est pas chargée par le bot.`);
}

function createCategorySelectMenu(client, userId) {
  const categories = getCategories(getAvailableCommands(client));

  if (categories.length === 0) {
    return [];
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`${HELP_CATEGORY_MENU_PREFIX}:${userId}`)
    .setPlaceholder("Sélectionne une catégorie")
    .addOptions(
      categories.slice(0, 25).map((category) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(category)
          .setValue(category)
          .setDescription(`Voir les commandes ${category.toLowerCase()}.`),
      ),
    );

  return [new ActionRowBuilder().addComponents(selectMenu)];
}

function findCommand(client, commandName) {
  return client.commands.get(normalizeCommandName(commandName));
}

function getAutocompleteChoices(client, focusedValue) {
  return getSearchableCommands(client)
    .filter((command) => {
      const searchableText = [
        command.name,
        command.description,
        command.category,
      ].join(" ").toLowerCase();

      return searchableText.includes(focusedValue);
    })
    .slice(0, 25)
    .map((command) => ({
      name: command.name,
      value: command.name,
    }));
}
