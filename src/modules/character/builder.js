const { SlashCommandBuilder } = require("discord.js");

function createCharacterCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("character")
    .setDescription("Gère les personnages roleplay du serveur.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Crée un personnage roleplay avec un formulaire."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Modifie un personnage roleplay avec un formulaire.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à modifier.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Supprime doucement un personnage roleplay avec un formulaire."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Liste les personnages roleplay.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Utilisateur dont tu veux voir les personnages.")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("Affiche la fiche d'un personnage roleplay.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage à afficher.")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    );
}

module.exports = {
  createCharacterCommandBuilder,
};
