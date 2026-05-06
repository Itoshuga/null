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

## Commande d'aide

La commande `/help` affiche un centre d'aide général avec un menu déroulant par catégorie.

Elle accepte aussi une option facultative :

```text
/help commande:ping
```

L'option `commande` propose une autocomplétion avec les commandes chargées par le bot.

Dans ce cas, le bot affiche directement la description, la catégorie, l'utilisation, le statut et les options de la commande demandée.

## Commande de statistiques RP

La commande `/stats` gère les statistiques roleplay propres à chaque serveur Discord.

Les données sont stockées dans Firestore ici :

```text
/guilds/{GUILD_ID}/statistics/{STAT_ID}
```

Sous-commandes disponibles :

- `/stats create` : crée une statistique roleplay.
- `/stats edit` : modifie une statistique existante.
- `/stats delete` : supprime doucement une statistique existante.
- `/stats list` : liste les statistiques du serveur.
- `/stats view` : affiche le détail d'une statistique.

Les sous-commandes `create`, `edit` et `delete` demandent la permission `Gérer le serveur`.

`/stats create` et `/stats edit` gèrent les options `name`, `description`, `default_value`, `min_value`, `max_value`, `order`, `category`, `emoji` et `is_active`.

Les options `statistic` de `edit`, `delete` et `view` proposent une autocomplétion depuis Firestore. Les statistiques supprimées sont ignorées. Le nom lisible est affiché à l'utilisateur, mais l'identifiant de la statistique est envoyé au bot.

La suppression est une suppression douce : le document reste dans Firestore avec `isDeleted: true`, afin de ne pas casser plus tard les fiches de personnages qui utiliseraient encore cette statistique.

Chaque document de statistique contient :

```js
{
  id: "force",
  name: "Force",
  description: "Représente la puissance physique du personnage.",
  defaultValue: 10,
  minValue: 0,
  maxValue: 100,
  category: "Physique",
  emoji: "💪",
  order: 1,
  isActive: true,
  isDeleted: false,
  createdBy: "id_utilisateur",
  updatedBy: "id_utilisateur",
  deletedBy: null,
  createdAt: "2026-05-06T10:00:00.000Z",
  updatedAt: "2026-05-06T10:00:00.000Z",
  deletedAt: null
}
```

## Commande de personnages RP

La commande `/character` permet à chaque utilisateur de gérer ses personnages roleplay sur un serveur Discord.

Les données sont stockées dans Firestore ici :

```text
/guilds/{GUILD_ID}/characters/{CHARACTER_ID}
```

Sous-commandes disponibles :

- `/character create` : crée un personnage.
- `/character edit` : modifie un personnage existant.
- `/character delete` : supprime doucement un personnage.
- `/character list` : liste les personnages d'un utilisateur.
- `/character view` : affiche la fiche détaillée d'un personnage.

Chaque utilisateur peut avoir jusqu'à 3 personnages actifs par serveur. Les personnages supprimés sont conservés avec `isDeleted: true`, afin de garder un historique propre.

`/character create` demande `name`, `description`, `proxy` et `avatar`. Le proxy doit être unique sur le serveur, contenir entre 3 et 20 caractères, et se terminer par `:`.

À la création, le personnage reçoit automatiquement toutes les statistiques actives du serveur avec leur valeur par défaut.

Chaque document de personnage contient :

```js
{
  id: "isen",
  ownerId: "id_utilisateur",
  name: "Isen",
  avatarUrl: "https://image.png",
  description: "Un rôdeur silencieux venu du nord.",
  proxy: "isen:",
  statistics: {
    force: 10,
    agilite: 10
  },
  statisticsVersion: 1,
  isActive: true,
  isDeleted: false,
  createdBy: "id_utilisateur",
  updatedBy: "id_utilisateur",
  deletedBy: null,
  createdAt: "2026-05-06T10:00:00.000Z",
  updatedAt: "2026-05-06T10:00:00.000Z",
  deletedAt: null
}
```

## Proxy roleplay

L'événement `messageCreate` détecte les messages qui commencent par le proxy d'un personnage.

Exemple :

```text
isen:salut tout le monde
```

Le bot retrouve le personnage, vérifie qu'il appartient à l'auteur du message, envoie le texte via webhook avec le nom et l'avatar du personnage, puis supprime le message original.

Les webhooks sont stockes par salon dans Firestore :

```text
/guilds/{GUILD_ID}/webhooks/{CHANNEL_ID}
```

Le bot doit avoir les permissions `Voir le salon`, `Envoyer des messages`, `Gérer les webhooks` et `Gérer les messages` dans les salons où le proxy RP est utilisé.

Le proxy RP utilise aussi l'intent `MessageContent`, qui doit être activé dans le portail développeur Discord du bot.

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
    roleplay/
      stats.js
    utilitaires/
      help.js
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
    statisticsService.js
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

  name: "exemple",
  description: "Commande d'exemple.",
  category: "Utilitaires",
  usage: "/exemple",

  isEnabled: true,
  isDeployed: true,

  async execute(interaction) {
    await interaction.reply("Réponse de la commande exemple.");
  },
};
```

Chaque commande doit fournir au minimum `data`, `name`, `description`, `category`, `usage`, `isEnabled`, `isDeployed` et `execute`.

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

  name: "dire",
  description: "Répète un message.",
  category: "Utilitaires",
  usage: "/dire message:texte",

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
