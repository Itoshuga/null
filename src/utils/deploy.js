const { REST, Routes } = require("discord.js");

async function deployCommands(client) {
    const token = process.env.TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;
    const scope = (process.env.DEPLOY_SCOPE || "guild").toLowerCase();

    if (!token || !clientId) {
        throw new Error("TOKEN et CLIENT_ID sont requis dans le .env");
    }

    const commands = [...client.slashCommands.values()].map((cmd) => cmd.data.toJSON());
    const rest = new REST({ version: "10" }).setToken(token);

    console.log(`⏳ Déploiement des SlashCommands (${scope})...`);

    if (scope === "global") {
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log("✅ SlashCommands déployées en GLOBAL");
        return;
    }

    // scope guild (dev)
    if (!guildId) {
        throw new Error("GUILD_ID est requis pour DEPLOY_SCOPE=guild");
    }
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log("✅ SlashCommands déployées sur le SERVEUR (guild)");
}

module.exports = { deployCommands };