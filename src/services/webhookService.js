function getDb() {
  return require("./firebase").db;
}

/**
 * Retourne la collection qui garde les webhooks RP par salon.
 * Chemin final : /guilds/{GUILD_ID}/webhooks/{CHANNEL_ID}
 */
function getWebhooksCollection(guildId) {
  return getDb().collection("guilds").doc(guildId).collection("webhooks");
}

async function getWebhookRecord(guildId, channelId) {
  const snapshot = await getWebhooksCollection(guildId).doc(channelId).get();

  return snapshot.exists ? snapshot.data() : null;
}

async function saveWebhookRecord(guildId, channelId, webhook) {
  const now = new Date().toISOString();
  const currentRecord = await getWebhookRecord(guildId, channelId);

  await getWebhooksCollection(guildId).doc(channelId).set({
    channelId,
    webhookId: webhook.id,
    webhookToken: webhook.token,
    createdAt: currentRecord?.createdAt || now,
    updatedAt: now,
  });
}

async function fetchSavedWebhook(client, record) {
  if (!record?.webhookId || !record?.webhookToken) {
    return null;
  }

  try {
    return await client.fetchWebhook(record.webhookId, record.webhookToken);
  } catch {
    return null;
  }
}

/**
 * Récupère le webhook RP d'un salon, ou le crée si aucun webhook valide n'existe.
 * Le token du webhook reste uniquement en base et ne doit jamais être affiché dans les logs.
 */
async function getOrCreateChannelWebhook(guildId, channel, client) {
  const savedRecord = await getWebhookRecord(guildId, channel.id);
  const savedWebhook = await fetchSavedWebhook(client, savedRecord);

  if (savedWebhook) {
    return savedWebhook;
  }

  if (typeof channel.createWebhook !== "function") {
    return null;
  }

  const webhook = await channel.createWebhook({
    name: "Proxy RP",
    reason: "Webhook utilisé par le proxy roleplay du bot.",
  });

  await saveWebhookRecord(guildId, channel.id, webhook);

  return webhook;
}

module.exports = {
  getOrCreateChannelWebhook,
  getWebhookRecord,
  saveWebhookRecord,
};
