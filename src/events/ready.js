const { deployCommands } = require("../utils/deploy");

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`🤖 Connecté en tant que ${client.user.tag}`);

        try {
            await deployCommands(client);
        } catch (err) {
            console.error("❌ Échec du déploiement des commandes :", err);
        }
    },
};