const { SlashCommandBuilder } = require("discord.js");

const { getShopService } = require("./shared");

function createItemCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("item")
    .setDescription("Gère la boutique et l'inventaire roleplay.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("shop")
        .setDescription("Affiche le magasin interactif.")
        .addStringOption((option) => addCharacterOption(option, "Personnage qui consulte le magasin."))
        .addStringOption((option) => addCategoryOption(option)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("inventory")
        .setDescription("Affiche l'inventaire d'un personnage.")
        .addStringOption((option) => addCharacterOption(option, "Personnage à consulter.")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("use")
        .setDescription("Utilise un objet de l'inventaire.")
        .addStringOption((option) => addCharacterOption(option, "Personnage qui utilise l'objet."))
        .addStringOption((option) => addItemOption(option, "Objet à utiliser.")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Achète directement un objet du magasin.")
        .addStringOption((option) => addCharacterOption(option, "Personnage qui achète l'objet."))
        .addStringOption((option) => addItemOption(option, "Objet à acheter.")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sell")
        .setDescription("Vend un objet et récupère 50 % de sa valeur d'achat.")
        .addStringOption((option) => addCharacterOption(option, "Personnage qui vend l'objet."))
        .addStringOption((option) => addItemOption(option, "Objet à vendre.")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Affiche les informations d'un objet.")
        .addStringOption((option) => addItemOption(option, "Objet à consulter.")),
    );
}

function addCharacterOption(option, description) {
  return option
    .setName("character")
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

function addItemOption(option, description) {
  return option
    .setName("item")
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

function addCategoryOption(option) {
  option
    .setName("category")
    .setDescription("Catégorie du magasin.")
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
  createItemCommandBuilder,
};
