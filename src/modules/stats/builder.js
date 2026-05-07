const { SlashCommandBuilder } = require("discord.js");

function createStatsCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Gère les statistiques roleplay du serveur.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Crée une statistique roleplay.")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Nom de la statistique.")
            .setRequired(true)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Description de la statistique.")
            .setRequired(false)
            .setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName("default_value")
            .setDescription("Valeur par défaut.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("min_value")
            .setDescription("Valeur minimale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("max_value")
            .setDescription("Valeur maximale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("order")
            .setDescription("Ordre d'affichage.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Catégorie RP de la statistique.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Emoji affiché avec la statistique.")
            .setRequired(false)
            .setMaxLength(32),
        )
        .addBooleanOption((option) =>
          option
            .setName("is_active")
            .setDescription("Indique si la statistique est active.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Modifie une statistique roleplay existante.")
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique à modifier.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Nouveau nom de la statistique.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("description")
            .setDescription("Nouvelle description de la statistique.")
            .setRequired(false)
            .setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName("default_value")
            .setDescription("Nouvelle valeur par défaut.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("min_value")
            .setDescription("Nouvelle valeur minimale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("max_value")
            .setDescription("Nouvelle valeur maximale.")
            .setRequired(false),
        )
        .addIntegerOption((option) =>
          option
            .setName("order")
            .setDescription("Nouvel ordre d'affichage.")
            .setRequired(false),
        )
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Nouvelle catégorie RP.")
            .setRequired(false)
            .setMaxLength(80),
        )
        .addStringOption((option) =>
          option
            .setName("emoji")
            .setDescription("Nouvel emoji de la statistique.")
            .setRequired(false)
            .setMaxLength(32),
        )
        .addBooleanOption((option) =>
          option
            .setName("is_active")
            .setDescription("Active ou désactive la statistique.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Supprime doucement une statistique roleplay.")
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique à supprimer.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Liste les statistiques roleplay du serveur."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("Affiche le détail d'une statistique roleplay.")
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique à consulter.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );
}

module.exports = {
  createStatsCommandBuilder,
};
