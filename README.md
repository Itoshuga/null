# Mon Bot Discord

Base complète pour créer un bot Discord francophone en JavaScript avec `discord.js`, les Slash Commands et Firebase Firestore.

Le projet est pensé pour rester simple à lire, facile à maintenir et prêt à évoluer avec de nouvelles commandes, de nouveaux événements et des services supplémentaires.

## Technologies

- JavaScript avec Node.js
- `discord.js` pour Discord
- `firebase-admin` pour Firestore
- `dotenv` pour les variables sensibles
- npm comme gestionnaire de paquets

## Installation

```bash
npm install
```

Copiez ensuite `.env.example` vers `.env`, puis renseignez vos vraies valeurs Discord et Firebase.

Le fichier `firebase-service-account.example.json` sert uniquement d'exemple. Téléchargez la vraie clé de service depuis Firebase, placez-la à la racine sous le nom `firebase-service-account.json`, puis gardez ce fichier privé.

## Configuration

Variables attendues dans `.env` :

```env
DISCORD_TOKEN=token_du_bot
CLIENT_ID=id_du_client_discord
GUILD_ID=id_du_serveur_de_test
DEPLOY_COMMANDS_GLOBAL=false
FIREBASE_PROJECT_ID=id_du_projet_firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

`DEPLOY_COMMANDS_GLOBAL=false` déploie les commandes uniquement sur `GUILD_ID`, ce qui est recommandé pendant le développement car c'est presque immédiat. En global, Discord peut mettre plus de temps à propager les commandes.

## Lancement

```bash
npm run start
```

Au démarrage, le bot parcourt automatiquement `src/commands`, ignore les commandes avec `isDeployed: false`, synchronise les Slash Commands autorisées avec Discord, puis se connecte.

## Logs console

Le logger centralisé se trouve dans `src/utils/logger.js`.

Il ajoute automatiquement :

- un horodatage ;
- un niveau de log : `INFO`, `OK`, `WARN`, `ERROR` ;
- une source lisible : `BOT`, `COMMANDES`, `EVENEMENTS`, `DEPLOIEMENT`, `FIREBASE` ;
- des couleurs ANSI dans les terminaux compatibles ;
- des helpers de pluriel pour éviter les formulations artificielles avec parenthèses.

Les couleurs peuvent être désactivées avec `NO_COLOR=1` ou forcées avec `FORCE_COLOR=1`.

## Structure

```text
src/
  commands/
    fun/
    moderation/
    utilitaires/
      ping.js
  events/
    client/
      ready.js
      interactionCreate.js
    guild/
      guildCreate.js
  handlers/
    commandHandler.js
    eventHandler.js
    deployHandler.js
  services/
    firebase.js
  config/
    botConfig.js
  utils/
    fileLoader.js
    logger.js
  index.js
```

## Créer une commande

Créez un fichier dans une catégorie, par exemple `src/commands/utilitaires/exemple.js` :

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("exemple")
    .setDescription("Commande d'exemple."),

  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    await interaction.reply("Réponse de la commande exemple.");
  },
};
```

`isEnabled: false` garde la commande chargée, mais répond aux utilisateurs qu'elle est en maintenance.

`isDeployed: false` garde le fichier dans le projet, mais empêche son envoi à Discord pendant le déploiement.

## Exemple avec option Discord

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dire")
    .setDescription("Répète un message.")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Message à répéter.")
        .setRequired(true),
    ),

  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    const message = interaction.options.getString("message");
    await interaction.reply(message);
  },
};
```

## Utiliser Firestore

Dans une commande ou un service :

```js
const { db } = require("../../services/firebase");

const document = await db.collection("serveurs").doc(interaction.guildId).get();
```

Firestore est initialisé une seule fois dans `src/services/firebase.js`, puis réutilisable partout dans le projet.
