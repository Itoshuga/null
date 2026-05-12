const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const PING_COLORS = {
  healthy: 0xc9ced8,
  warning: 0x8d94a0,
};

module.exports = {
  name: "ping",
  description: "Permet de vérifier la latence du bot et de Firestore.",
  category: "Utilitaires",
  usage: "/ping",
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Permet de vérifier la latence du bot et de Firestore."),
  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const commandStartAt = Date.now();

    await interaction.deferReply();

    const discordLatency = Date.now() - interaction.createdTimestamp;
    const websocketLatency = Math.round(interaction.client.ws.ping);
    const databaseStatus = await measureDatabaseLatency();
    const commandDuration = Date.now() - commandStartAt;

    await interaction.editReply({
      embeds: [
        createPingEmbed({
          commandDuration,
          databaseStatus,
          discordLatency,
          websocketLatency,
        }),
      ],
    });
  },
};

function getDb() {
  return require("../../services/firebase").db;
}

async function measureDatabaseLatency() {
  const startAt = Date.now();

  try {
    // Lecture légère : elle vérifie que Firestore répond sans modifier la base de données.
    await getDb().collection("_health").doc("ping").get();

    return {
      isAvailable: true,
      latency: Date.now() - startAt,
    };
  } catch (error) {
    return {
      error,
      isAvailable: false,
      latency: null,
    };
  }
}

function createPingEmbed({ commandDuration, databaseStatus, discordLatency, websocketLatency }) {
  const isHealthy = databaseStatus.isAvailable;
  const databaseValue = isHealthy ? formatLatency(databaseStatus.latency) : "`Indisponible`";

  const embed = new EmbedBuilder()
    .setColor(isHealthy ? PING_COLORS.healthy : PING_COLORS.warning)
    .setDescription([
      "### \\🏓 **Diagnostic du bot**",
      "",
      "**Discord**",
      `Interaction | ${formatLatency(discordLatency)}`,
      `WebSocket | ${formatLatency(websocketLatency)}`,
      "",
      "**Base de données**",
      `Firestore | ${formatStatusIcon(isHealthy)} ${databaseValue}`,
      "",
      "**Commande**",
      `Traitement total | ${formatLatency(commandDuration)}`,
    ].join("\n"))
    .setTimestamp();

  if (!isHealthy) {
    embed.setFooter({ text: "Firestore n'a pas répondu correctement." });
  }

  return embed;
}

function formatLatency(latency) {
  if (!Number.isFinite(latency) || latency < 0) {
    return "`Non mesurée`";
  }

  return `\`${latency} ms\``;
}

function formatStatusIcon(isAvailable) {
  return isAvailable ? "🟢" : "🔴";
}
