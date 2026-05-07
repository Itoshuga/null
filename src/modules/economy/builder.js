const { SlashCommandBuilder } = require("discord.js");

const {
  MAX_PAYMENT_AMOUNT,
  MAX_STANDARD_AMOUNT,
} = require("./constants");

function createEconomyCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("economy")
    .setDescription("Gère l'économie roleplay des personnages.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("work")
        .setDescription("Fait travailler un personnage.")
        .addStringOption((option) => addOwnedCharacterOption(option, "Personnage qui travaille.", "character")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("balance")
        .setDescription("Affiche le solde complet d'un personnage.")
        .addStringOption((option) => addOwnedCharacterOption(option, "Personnage à consulter.", "character")),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deposit")
        .setDescription("Dépose de l'argent en banque.")
        .addStringOption((option) => addOwnedCharacterOption(option, "Personnage concerné.", "character"))
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
        .addStringOption((option) => addOwnedCharacterOption(option, "Personnage concerné.", "character"))
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
        .addStringOption((option) => addOwnedCharacterOption(option, "Ton personnage qui envoie l'argent.", "from_character"))
        .addStringOption((option) => addOwnedCharacterOption(option, "Personnage qui reçoit l'argent.", "to_character"))
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
        .addStringOption((option) => addOwnedCharacterOption(option, "Personnage concerné.", "character")),
    );
}

function addOwnedCharacterOption(option, description, name) {
  return option
    .setName(name)
    .setDescription(description)
    .setRequired(true)
    .setAutocomplete(true);
}

module.exports = {
  createEconomyCommandBuilder,
};
