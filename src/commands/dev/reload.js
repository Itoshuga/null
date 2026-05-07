const {
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} = require("discord.js");

const botConfig = require("../../config/botConfig");

const RELOAD_COLOR = 0xc9ced8;

module.exports = {
  name: "reload",
  description: "Recharge une commande sans redémarrer le bot.",
  category: "Développeur",
  usage: "/reload command:<commande> [deploy:true|false]",
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Recharge une commande sans redémarrer le bot.")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Commande à recharger.")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("deploy")
        .setDescription("Redéploie aussi les Slash Commands après le rechargement.")
        .setRequired(false),
    ),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction, client) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({
        content: "Cette commande est réservée aux développeurs du bot.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const commandName = interaction.options.getString("command", true);
    const shouldDeploy = interaction.options.getBoolean("deploy") ?? false;

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const { reloadCommand } = require("../../handlers/commandHandler");
      const reloadedCommand = reloadCommand(client, commandName);

      if (shouldDeploy) {
        const { deployCommands } = require("../../handlers/deployHandler");

        await deployCommands();
      }

      await interaction.editReply({
        embeds: [createReloadEmbed(reloadedCommand, shouldDeploy)],
      });
    } catch (error) {
      await interaction.editReply({
        content: `Impossible de recharger la commande : ${error.message}`,
      });
    }
  },

  async autocomplete(interaction, client) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.respond([]);
      return;
    }

    const focusedValue = normalizeCommandName(interaction.options.getFocused() || "");
    const choices = [...client.commands.values()]
      .filter((command) => {
        const searchableText = normalizeCommandName(`${command.name} ${command.description} ${command.category}`);

        return searchableText.includes(focusedValue);
      })
      .sort((firstCommand, secondCommand) => firstCommand.name.localeCompare(secondCommand.name, "fr"))
      .slice(0, 25)
      .map((command) => ({
        name: command.name,
        value: command.name,
      }));

    await interaction.respond(choices);
  },
};

function isDeveloper(userId) {
  return botConfig.developers.ids.includes(userId);
}

function createReloadEmbed(command, hasDeployed) {
  const description = [
    "### \\♻️ **Commande rechargée**",
    `La commande **/${command.name}** a été rechargée en mémoire.`,
    hasDeployed ? "Les Slash Commands ont aussi été redéployées." : "Le déploiement Discord n'a pas été relancé.",
  ].join("\n");

  return new EmbedBuilder()
    .setColor(RELOAD_COLOR)
    .setDescription(description);
}

function normalizeCommandName(value) {
  return value.trim().replace(/^\//, "").toLowerCase();
}
