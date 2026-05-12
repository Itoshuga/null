const {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");

const HELP_CATEGORY_MENU_PREFIX = "help:category";
const DISCORD_OPTION_TYPES = {
  SUBCOMMAND: 1,
  SUBCOMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
  NUMBER: 10,
  ATTACHMENT: 11,
};

const HELP_EMBED_COLORS = {
  general: 0xf2f4f8,
  command: 0xc9ced8,
  category: 0x2d323c,
  warning: 0x8d94a0,
};

const HELP_FOOTER_TEXT = "Centre d'Aide";

module.exports = {
  name: "help",
  description: "Affiche le centre d'aide du bot.",
  category: "Utilitaires",
  usage: "/help [commande] [groupe] [sous_commande]",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche le centre d'aide du bot.")
    .addStringOption((option) =>
      option
        .setName("commande")
        .setDescription("Nom de la commande à consulter.")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("groupe")
        .setDescription("Groupe de sous-commandes à consulter.")
        .setRequired(false)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option
        .setName("sous_commande")
        .setDescription("Sous-commande à consulter.")
        .setRequired(false)
        .setAutocomplete(true),
    ),
  isEnabled: true,
  isDeployed: true,

  componentPrefix: HELP_CATEGORY_MENU_PREFIX,

  async execute(interaction, client) {
    const requestedCommandName = interaction.options.getString("commande");
    const requestedGroupName = interaction.options.getString("groupe");
    const requestedSubcommandName = interaction.options.getString("sous_commande");

    if (requestedCommandName) {
      const command = findCommand(client, requestedCommandName);
      const embed = command
        ? createCommandHelpEmbed(command, requestedGroupName, requestedSubcommandName)
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
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = normalizeSearchText(focusedOption.value || "");
    const choices = getAutocompleteChoices(interaction, client, focusedOption.name, focusedValue);

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

function getCommandOptions(command) {
  return getCommandPayload(command).options || [];
}

function isSubcommand(option) {
  return option.type === DISCORD_OPTION_TYPES.SUBCOMMAND;
}

function isSubcommandGroup(option) {
  return option.type === DISCORD_OPTION_TYPES.SUBCOMMAND_GROUP;
}

function getPlainOptions(options = []) {
  return options.filter((option) => !isSubcommand(option) && !isSubcommandGroup(option));
}

function getDirectSubcommands(command) {
  return getCommandOptions(command).filter(isSubcommand);
}

function getSubcommandGroups(command) {
  return getCommandOptions(command).filter(isSubcommandGroup);
}

function normalizeCommandName(commandName) {
  return normalizeSearchText(commandName).replace(/^\//, "");
}

function normalizeSearchText(value) {
  return String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
    [DISCORD_OPTION_TYPES.STRING]: "texte",
    [DISCORD_OPTION_TYPES.INTEGER]: "nombre entier",
    [DISCORD_OPTION_TYPES.BOOLEAN]: "booléen",
    [DISCORD_OPTION_TYPES.USER]: "utilisateur",
    [DISCORD_OPTION_TYPES.CHANNEL]: "salon",
    [DISCORD_OPTION_TYPES.ROLE]: "rôle",
    [DISCORD_OPTION_TYPES.MENTIONABLE]: "mentionnable",
    [DISCORD_OPTION_TYPES.NUMBER]: "nombre",
    [DISCORD_OPTION_TYPES.ATTACHMENT]: "fichier",
  };

  return optionTypes[type] || "option";
}

function formatOptions(options = []) {
  const visibleOptions = getPlainOptions(options);

  if (visibleOptions.length === 0) {
    return "Aucune option.";
  }

  return visibleOptions
    .map((option) => {
      const requiredLabel = option.required ? "obligatoire" : "facultative";
      const typeLabel = getOptionTypeLabel(option.type);
      const choices = formatOptionChoices(option);

      return `\`${option.name}\` (${typeLabel}, ${requiredLabel}) - ${option.description}${choices}`;
    })
    .join("\n");
}

function formatOptionChoices(option) {
  if (!option.choices || option.choices.length === 0) {
    return "";
  }

  const choices = option.choices
    .slice(0, 8)
    .map((choice) => `\`${choice.name}\``)
    .join(", ");
  const suffix = option.choices.length > 8 ? ", ..." : "";

  return ` | choix : ${choices}${suffix}`;
}

function formatSubcommandOverview(command) {
  const directSubcommands = getDirectSubcommands(command);
  const subcommandGroups = getSubcommandGroups(command);
  const sections = [];

  if (directSubcommands.length > 0) {
    sections.push(formatSubcommands(command.name, null, directSubcommands));
  }

  for (const group of subcommandGroups) {
    const subcommandNames = (group.options || [])
      .filter(isSubcommand)
      .map((subcommand) => `\`${subcommand.name}\``)
      .join(", ");

    sections.push(`**${group.name}** - ${group.description}\nSous-commandes : ${subcommandNames || "aucune"}`);
  }

  return sections.join("\n\n") || "Aucune sous-commande.";
}

function formatSubcommands(commandName, groupName, subcommands) {
  if (subcommands.length === 0) {
    return "Aucune sous-commande.";
  }

  return subcommands
    .map((subcommand) => {
      const commandPath = groupName
        ? `/${commandName} ${groupName} ${subcommand.name}`
        : `/${commandName} ${subcommand.name}`;

      return `\`${commandPath}\` - ${subcommand.description}`;
    })
    .join("\n");
}

function formatSubcommandUsage(commandPath, options = []) {
  const optionUsage = getPlainOptions(options)
    .map((option) => (option.required ? `<${option.name}>` : `[${option.name}]`))
    .join(" ");

  return optionUsage ? `${commandPath} ${optionUsage}` : commandPath;
}

function createGeneralHelpEmbed(client) {
  const availableCommands = getAvailableCommands(client);
  const categoryCount = getCategories(availableCommands).length;

  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.general)
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
    })
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
}

function createCommandHelpEmbed(command, requestedGroupName, requestedSubcommandName) {
  if (requestedGroupName) {
    const group = findSubcommandGroup(command, requestedGroupName);

    if (!group) {
      return createUnknownCommandPartEmbed(
        `Le groupe \`${requestedGroupName}\` n'existe pas sur la commande \`/${command.name}\`.`,
      );
    }

    if (requestedSubcommandName) {
      const subcommand = findSubcommandInGroup(group, requestedSubcommandName);

      if (!subcommand) {
        return createUnknownCommandPartEmbed(
          `La sous-commande \`${requestedSubcommandName}\` n'existe pas dans \`/${command.name} ${group.name}\`.`,
        );
      }

      return createSubcommandHelpEmbed(command, group, subcommand);
    }

    return createGroupHelpEmbed(command, group);
  }

  if (requestedSubcommandName) {
    const subcommand = findDirectSubcommand(command, requestedSubcommandName);

    if (!subcommand) {
      return createUnknownCommandPartEmbed(
        `La sous-commande \`${requestedSubcommandName}\` n'existe pas directement sur \`/${command.name}\`. Si elle appartient à un groupe, renseigne aussi l'option \`groupe\`.`,
      );
    }

    return createSubcommandHelpEmbed(command, null, subcommand);
  }

  const commandOptions = getCommandOptions(command);
  const hasSubcommands = getDirectSubcommands(command).length > 0 || getSubcommandGroups(command).length > 0;
  const fields = [
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
  ];

  if (hasSubcommands) {
    fields.push({
      name: "Sous-commandes",
      value: truncateText(formatSubcommandOverview(command), 1024),
    });
  } else {
    fields.push({
      name: "Options",
      value: truncateText(formatOptions(commandOptions), 1024),
    });
  }

  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.command)
    .setTitle(`📘 Aide de la commande /${command.name}`)
    .addFields(fields)
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
}

function createGroupHelpEmbed(command, group) {
  const subcommands = (group.options || []).filter(isSubcommand);

  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.command)
    .setTitle(`📘 Aide de /${command.name} ${group.name}`)
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
        value: group.description || "Aucune description.",
      },
      {
        name: "Utilisation",
        value: `\`/${command.name} ${group.name} <sous_commande>\``,
      },
      {
        name: "Sous-commandes",
        value: truncateText(formatSubcommands(command.name, group.name, subcommands), 1024),
      },
    )
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
}

function createSubcommandHelpEmbed(command, group, subcommand) {
  const commandPath = group
    ? `/${command.name} ${group.name} ${subcommand.name}`
    : `/${command.name} ${subcommand.name}`;
  const usage = formatSubcommandUsage(commandPath, subcommand.options);

  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.command)
    .setTitle(`📘 Aide de ${commandPath}`)
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
        value: subcommand.description || "Aucune description.",
      },
      {
        name: "Utilisation",
        value: `\`${usage}\``,
      },
      {
        name: "Options",
        value: truncateText(formatOptions(subcommand.options), 1024),
      },
    )
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
}

function createCategoryHelpEmbed(category, commands) {
  const commandList = commands
    .map((command) => `\`/${command.name}\` - ${command.description}`)
    .join("\n");

  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.category)
    .setTitle(`📘 Commandes ${category}`)
    .setDescription(commandList || "Aucune commande disponible dans cette catégorie.")
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
}

function createUnknownCommandEmbed(commandName) {
  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.warning)
    .setTitle("Commande introuvable")
    .setDescription(`La commande \`/${commandName}\` n'existe pas ou n'est pas chargée par le bot.`)
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
}

function createUnknownCommandPartEmbed(message) {
  return new EmbedBuilder()
    .setColor(HELP_EMBED_COLORS.warning)
    .setTitle("Aide introuvable")
    .setDescription(message)
    .setFooter({ text: HELP_FOOTER_TEXT })
    .setTimestamp();
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

function findOptionByName(options, optionName) {
  const normalizedOptionName = normalizeCommandName(optionName);

  return options.find((option) => normalizeCommandName(option.name) === normalizedOptionName);
}

function findSubcommandGroup(command, groupName) {
  return findOptionByName(getSubcommandGroups(command), groupName);
}

function findDirectSubcommand(command, subcommandName) {
  return findOptionByName(getDirectSubcommands(command), subcommandName);
}

function findSubcommandInGroup(group, subcommandName) {
  return findOptionByName((group.options || []).filter(isSubcommand), subcommandName);
}

function getAutocompleteChoices(interaction, client, focusedOptionName, focusedValue) {
  if (focusedOptionName === "groupe") {
    return getGroupAutocompleteChoices(client, interaction.options.getString("commande"), focusedValue);
  }

  if (focusedOptionName === "sous_commande") {
    return getSubcommandAutocompleteChoices(
      client,
      interaction.options.getString("commande"),
      interaction.options.getString("groupe"),
      focusedValue,
    );
  }

  return getCommandAutocompleteChoices(client, focusedValue);
}

function getCommandAutocompleteChoices(client, focusedValue) {
  return getSearchableCommands(client)
    .filter((command) => {
      const searchableText = [
        command.name,
        command.description,
        command.category,
      ].join(" ");

      return normalizeSearchText(searchableText).includes(focusedValue);
    })
    .slice(0, 25)
    .map((command) => ({
      name: command.name,
      value: command.name,
    }));
}

function getGroupAutocompleteChoices(client, commandName, focusedValue) {
  const command = commandName ? findCommand(client, commandName) : null;

  if (!command) {
    return [];
  }

  return getSubcommandGroups(command)
    .filter((group) => normalizeSearchText(`${group.name} ${group.description}`).includes(focusedValue))
    .slice(0, 25)
    .map((group) => ({
      name: group.name,
      value: group.name,
    }));
}

function getSubcommandAutocompleteChoices(client, commandName, groupName, focusedValue) {
  const command = commandName ? findCommand(client, commandName) : null;

  if (!command) {
    return [];
  }

  const group = groupName ? findSubcommandGroup(command, groupName) : null;
  const subcommands = group ? (group.options || []).filter(isSubcommand) : getDirectSubcommands(command);

  return subcommands
    .filter((subcommand) => normalizeSearchText(`${subcommand.name} ${subcommand.description}`).includes(focusedValue))
    .slice(0, 25)
    .map((subcommand) => ({
      name: subcommand.name,
      value: subcommand.name,
    }));
}

function truncateText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}
