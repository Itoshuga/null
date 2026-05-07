const { SlashCommandBuilder } = require("discord.js");

function createRollCommandBuilder() {
  return new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Lance des jets de dés roleplay.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("dice")
        .setDescription("Lance un jet de dés simple.")
        .addStringOption((option) =>
          option
            .setName("dice")
            .setDescription("Notation du jet, par exemple 1d20, 2d6 ou 1d100.")
            .setRequired(true)
            .setMaxLength(12),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stat")
        .setDescription("Lance un jet basé sur la statistique d'un personnage.")
        .addStringOption((option) =>
          option
            .setName("character")
            .setDescription("Personnage utilisé pour le jet.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("statistic")
            .setDescription("Statistique utilisée pour influencer le jet.")
            .setRequired(true)
            .setAutocomplete(true),
        )
        .addStringOption((option) =>
          option
            .setName("dice")
            .setDescription("Notation du jet, par exemple 1d20, 1d60 ou 2d12.")
            .setRequired(false)
            .setMaxLength(12),
        )
        .addStringOption((option) =>
          option
            .setName("difficulty")
            .setDescription("Difficulté du jet.")
            .setRequired(false)
            .addChoices(
              { name: "Facile", value: "easy" },
              { name: "Normale", value: "normal" },
              { name: "Difficile", value: "hard" },
              { name: "Très difficile", value: "very_hard" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Raison ou action du jet.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("custom")
        .setDescription("Lance un jet libre avec un modificateur manuel.")
        .addStringOption((option) =>
          option
            .setName("dice")
            .setDescription("Notation du jet, par exemple 1d20, 2d6 ou 1d100.")
            .setRequired(true)
            .setMaxLength(12),
        )
        .addIntegerOption((option) =>
          option
            .setName("modifier")
            .setDescription("Bonus ou malus manuel appliqué au résultat.")
            .setRequired(false)
            .setMinValue(-100)
            .setMaxValue(100),
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Raison ou action du jet.")
            .setRequired(false)
            .setMaxLength(300),
        ),
    );
}

module.exports = {
  createRollCommandBuilder,
};
