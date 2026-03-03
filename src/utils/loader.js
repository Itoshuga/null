const fs = require("node:fs");
const path = require("node:path");

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of list) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) results = results.concat(getFiles(fullPath));
    else if (file.name.endsWith(".js")) results.push(fullPath);
  }
  return results;
}

async function loadCommands(client) {
  const commandsPath = path.join(__dirname, "..", "commands");
  for (const file of getFiles(commandsPath)) {
    const command = require(file);
    if (!command?.data?.name || !command?.execute) continue;
    client.slashCommands.set(command.data.name, command);
  }
  console.log(`✅ SlashCommands chargées: ${client.slashCommands.size}`);
}

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, "..", "events");
  for (const file of getFiles(eventsPath)) {
    const event = require(file);
    if (!event?.name || !event?.execute) continue;

    if (event.once) client.once(event.name, (...args) => event.execute(client, ...args));
    else client.on(event.name, (...args) => event.execute(client, ...args));
  }
  console.log("✅ Events chargés");
}

module.exports = { loadCommands, loadEvents };