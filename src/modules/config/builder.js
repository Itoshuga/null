const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

const {
  MAX_ITEM_PRICE,
  getShopService,
} = require("./shared");

function createConfigCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configure les systèmes roleplay du serveur.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName("item")
        .setDescription("Configure les objets du magasin.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("create")
            .setDescription("Crée un objet.")
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Nom de l'objet.")
                .setRequired(true)
                .setMaxLength(80),
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("Description de l'objet.")
                .setRequired(true)
                .setMaxLength(500),
            )
            .addIntegerOption((option) =>
              option
                .setName("price")
                .setDescription("Prix de l'objet.")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(MAX_ITEM_PRICE),
            )
            .addStringOption((option) => addCategoryOption(option, "Catégorie de l'objet."))
            .addStringOption((option) =>
              option
                .setName("emoji")
                .setDescription("Emoji affiché avec l'objet.")
                .setRequired(false)
                .setMaxLength(32),
            )
            .addIntegerOption((option) =>
              option
                .setName("stock")
                .setDescription("Stock disponible. Laisse vide pour un stock illimité.")
                .setRequired(false)
                .setMinValue(0),
            )
            .addIntegerOption((option) =>
              option
                .setName("max_per_character")
                .setDescription("Quantité maximale par personnage.")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("edit")
            .setDescription("Modifie un objet.")
            .addStringOption((option) => addItemOption(option, "Objet à modifier."))
            .addStringOption((option) =>
              option
                .setName("name")
                .setDescription("Nouveau nom.")
                .setRequired(false)
                .setMaxLength(80),
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("Nouvelle description.")
                .setRequired(false)
                .setMaxLength(500),
            )
            .addIntegerOption((option) =>
              option
                .setName("price")
                .setDescription("Nouveau prix.")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(MAX_ITEM_PRICE),
            )
            .addStringOption((option) => addCategoryOption(option, "Nouvelle catégorie."))
            .addStringOption((option) =>
              option
                .setName("emoji")
                .setDescription("Nouvel emoji.")
                .setRequired(false)
                .setMaxLength(32),
            )
            .addIntegerOption((option) =>
              option
                .setName("stock")
                .setDescription("Nouveau stock.")
                .setRequired(false)
                .setMinValue(0),
            )
            .addIntegerOption((option) =>
              option
                .setName("max_per_character")
                .setDescription("Nouvelle limite par personnage.")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("delete")
            .setDescription("Supprime doucement un objet.")
            .addStringOption((option) => addItemOption(option, "Objet à supprimer.")),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("enable")
            .setDescription("Active un objet.")
            .addStringOption((option) => addItemOption(option, "Objet à activer.")),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("disable")
            .setDescription("Désactive un objet.")
            .addStringOption((option) => addItemOption(option, "Objet à désactiver.")),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("stats")
        .setDescription("Configure les statistiques RP.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("create")
            .setDescription("Crée une statistique.")
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
                .setRequired(false)
                .setMinValue(0),
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
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("edit")
            .setDescription("Modifie une statistique.")
            .addStringOption((option) => addStatisticOption(option, "Statistique à modifier."))
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
                .setRequired(false)
                .setMinValue(0),
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
            .setDescription("Supprime doucement une statistique.")
            .addStringOption((option) => addStatisticOption(option, "Statistique à supprimer.")),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Ajoute des points à la statistique d'un personnage.")
            .addStringOption((option) => addCharacterOption(option, "Personnage concerné."))
            .addStringOption((option) => addStatisticOption(option, "Statistique à augmenter."))
            .addIntegerOption((option) =>
              option
                .setName("value")
                .setDescription("Nombre de points à ajouter.")
                .setRequired(true)
                .setMinValue(1),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Retire des points à la statistique d'un personnage.")
            .addStringOption((option) => addCharacterOption(option, "Personnage concerné."))
            .addStringOption((option) => addStatisticOption(option, "Statistique à diminuer."))
            .addIntegerOption((option) =>
              option
                .setName("value")
                .setDescription("Nombre de points à retirer.")
                .setRequired(true)
                .setMinValue(1),
            ),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("money")
        .setDescription("Configure l'argent des personnages.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("give")
            .setDescription("Ajoute de l'argent à un personnage.")
            .addStringOption((option) => addCharacterOption(option, "Personnage qui reçoit l'argent."))
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Montant à ajouter.")
                .setRequired(true)
                .setMinValue(1),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Raison de l'ajout.")
                .setRequired(false)
                .setMaxLength(200),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Retire de l'argent à un personnage.")
            .addStringOption((option) => addCharacterOption(option, "Personnage concerné."))
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Montant à retirer.")
                .setRequired(true)
                .setMinValue(1),
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Raison du retrait.")
                .setRequired(false)
                .setMaxLength(200),
            ),
        ),
    );
}

function addItemOption(option, description) {
  return option
    .setName("item")
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

function addCharacterOption(option, description) {
  return option
    .setName("character")
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

function addStatisticOption(option, description) {
  return option
    .setName("statistic")
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

function addCategoryOption(option, description) {
  option
    .setName("category")
    .setDescription(description)
    .setRequired(false);

  for (const [category, label] of Object.entries(getShopService().CATEGORY_LABELS)) {
    option.addChoices({
      name: label,
      value: category,
    });
  }

  return option;
}

module.exports = {
  createConfigCommandBuilder,
};
