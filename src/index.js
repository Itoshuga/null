require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { loadCommands, loadEvents } = require("./utils/loader");

const client = new Client({
    intents: [GatewayIntentBits.Guilds], // suffisant pour slash commands
});

client.slashCommands = new Collection();

(async() => {
    await loadCommands(client);
    await loadEvents(client);
    await client.login(process.env.TOKEN);
})();