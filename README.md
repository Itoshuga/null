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
DEVELOPER_IDS=id_discord_du_developpeur
FIREBASE_PROJECT_ID=id_du_projet_firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

`DEPLOY_COMMANDS_GLOBAL=false` déploie les commandes uniquement sur `GUILD_ID`, ce qui est recommandé pendant le développement car c'est presque immédiat. En global, Discord peut mettre plus de temps à propager les commandes.

## Lancement

```bash
npm run start
```

Au démarrage, le bot parcourt automatiquement `src/commands`, ignore les commandes avec `isDeployed: false`, synchronise les Slash Commands autorisées avec Discord, puis se connecte.

## Commande développeur

La commande `/reload` permet de recharger une commande en mémoire sans redémarrer le bot.

Elle est visible dans `/help`, mais son exécution est réservée aux identifiants Discord présents dans `DEVELOPER_IDS`.

```text
/reload command:stats
/reload command:stats deploy:true
```

L'option `deploy:true` relance aussi la synchronisation des Slash Commands Discord, utile si la structure de la commande a changé.

## Commande d'aide

La commande `/help` affiche un centre d'aide général avec un menu déroulant par catégorie.

Elle accepte aussi une option facultative :

```text
/help commande:ping
```

L'option `commande` propose une autocomplétion avec les commandes chargées par le bot.

Dans ce cas, le bot affiche directement la description, la catégorie, l'utilisation, le statut et les options de la commande demandée.

## Commande de statistiques RP

La commande `/stats` permet de consulter les statistiques roleplay propres à chaque serveur Discord.

Les données sont stockées dans Firestore ici :

```text
/guilds/{GUILD_ID}/statistics/{STAT_ID}
```

Sous-commandes disponibles :

- `/stats list` : liste les statistiques du serveur.
- `/stats view` : affiche le détail d'une statistique.

Les modifications de statistiques sont centralisées dans `/config stats`, qui demande la permission `Gérer le serveur`.

`/config stats add` demande `character`, `statistic` et `value`. Si le personnage a `10` dans la statistique et que `value` vaut `5`, il passe à `15`.

`/config stats remove` demande aussi `character`, `statistic` et `value`. Si le personnage a `10` et que `value` vaut `5`, il passe à `5`.

`/config stats edit` gère les options `name`, `description`, `default_value`, `min_value`, `max_value`, `order`, `category`, `emoji` et `is_active`.

Les options `statistic` de `view` et de `/config stats` proposent une autocomplétion depuis Firestore. Les statistiques supprimées sont ignorées. Le nom lisible est affiché à l'utilisateur, mais l'identifiant de la statistique est envoyé au bot.

La création et la suppression douce des statistiques globales du serveur se font aussi via `/config stats create` et `/config stats delete`.

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

`/character create` ouvre un formulaire Discord pour saisir `name`, `description`, `proxy` et envoyer l'avatar du personnage en pièce jointe. Le proxy doit être unique sur le serveur, contenir entre 3 et 20 caractères, et se terminer par `:`.

`/character edit character:<personnage>` ouvre directement un formulaire d'édition prérempli avec son nom, sa description et son proxy. L'avatar peut aussi être remplacé en envoyant une nouvelle image.

`/character delete` ouvre aussi un formulaire Discord avec un menu déroulant pour choisir le personnage à supprimer.

`/character list` affiche une interface interactive sous forme de carousel, avec un personnage par page et des boutons `Précédent` / `Suivant`.

`/character view` affiche par défaut uniquement la description et l'image du personnage. Des boutons permettent ensuite d'afficher les informations, les statistiques ou l'économie sous forme de champs inline.

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

## Commande d'économie RP

La commande `/economy` gère l'argent des personnages roleplay. L'économie est liée aux personnages, pas directement aux utilisateurs Discord.

Sous-commandes disponibles :

- `/economy work` : fait travailler un personnage et ajoute une récompense à son argent sur soi.
- `/economy balance` : affiche l'argent sur soi, en banque et total d'un personnage.
- `/economy deposit` : dépose de l'argent en banque.
- `/economy withdraw` : retire de l'argent de la banque.
- `/economy payment` : transfère de l'argent entre deux personnages.
- `/economy transactions` : affiche les transactions récentes d'un personnage.

Chaque personnage stocke ses données économiques dans son document Firestore :

```js
{
  economy: {
    wallet: 3250,
    bank: 12000,
    lastWorkAt: "2026-05-06T10:00:00.000Z"
  }
}
```

Les transactions économiques sont stockées ici :

```text
/guilds/{GUILD_ID}/transactions/{TRANSACTION_ID}
```

Les mouvements d'argent `work`, `deposit`, `withdraw` et `payment` utilisent des transactions Firestore afin d'éviter les soldes négatifs et les doublons.

La configuration économie peut être stockée ici :

```text
/guilds/{GUILD_ID}/settings/economy
```

Valeurs par défaut :

```js
{
  currencySymbol: "¥",
  workCooldownHours: 6,
  workMinReward: 1000,
  workMaxReward: 2000,
  startingWallet: 0,
  startingBank: 0,
  allowSelfCharacterPayments: true
}
```

## Objets et boutique RP

La commande `/item` gère la boutique et l'inventaire roleplay des personnages.

Sous-commandes disponibles :

- `/item shop` : affiche le magasin interactif avec les Components V2 de Discord.
- `/item inventory` : affiche l'inventaire d'un personnage.
- `/item use` : utilise un objet de l'inventaire.
- `/item buy` : achète directement un objet du magasin.
- `/item sell` : vend un objet et récupère 50 % de sa valeur d'achat.
- `/item info` : affiche les informations d'un objet.

Le joueur choisit le personnage qui achète :

```text
/item shop character:Isen
```

Une catégorie peut aussi être sélectionnée :

```text
/item shop character:Isen category:vehicles
```

Le bot affiche les objets disponibles avec leur description, leur prix, leur stock éventuel et un bouton d'achat aligné à droite de chaque objet. Le magasin est paginé automatiquement quand il y a trop d'objets sur une seule page.

Les achats utilisent l'argent sur soi du personnage, sont confirmés en privé et créent une transaction `shop_purchase` visible dans `/economy transactions`.

Les ventes utilisent l'objet possédé dans l'inventaire du personnage, rendent 50 % du prix d'achat dans son argent sur soi et créent une transaction `shop_sale`.

Les objets de boutique sont stockés ici :

```text
/guilds/{GUILD_ID}/shopItems/{ITEM_ID}
```

Les objets achetés sont ajoutés à l'inventaire du personnage :

```text
/guilds/{GUILD_ID}/characters/{CHARACTER_ID}/inventory/{ITEM_ID}
```

Chaque objet de boutique contient notamment :

```js
{
  id: "basic-car",
  name: "Voiture banale",
  emoji: "🚙",
  description: "Véhicule ordinaire, simple et fonctionnel.",
  price: 25000,
  category: "vehicles",
  isEnabled: true,
  isLimited: false,
  stock: null,
  maxPerCharacter: null,
  isDeleted: false,
  createdBy: "id_utilisateur",
  updatedBy: "id_utilisateur",
  createdAt: "2026-05-06T10:00:00.000Z",
  updatedAt: "2026-05-06T10:00:00.000Z"
}
```

## Configuration staff

La commande `/config` centralise les actions réservées au staff. Elle demande la permission `Gérer le serveur`.

Configuration des objets :

- `/config item create` : crée un objet.
- `/config item edit` : modifie un objet.
- `/config item delete` : supprime doucement un objet.
- `/config item enable` : rend un objet visible.
- `/config item disable` : masque un objet.

Configuration des statistiques :

- `/config stats create` : crée une statistique et la synchronise aux personnages actifs.
- `/config stats edit` : modifie une statistique existante.
- `/config stats delete` : supprime doucement une statistique.
- `/config stats add` : ajoute des points à la statistique d'un personnage.
- `/config stats remove` : retire des points à la statistique d'un personnage.

Configuration de l'argent :

- `/config money give` : ajoute de l'argent sur soi à un personnage.
- `/config money remove` : retire de l'argent sur soi à un personnage.

Les mouvements d'argent staff créent des transactions `admin_add` et `admin_remove`, visibles dans `/economy transactions`.

Les anciennes actions de gestion de boutique sont donc regroupées dans `/config item`.

## Commande de jets RP

La commande `/roll` permet de lancer des jets de dés roleplay.

Sous-commandes disponibles :

- `/roll dice` : lance un jet de dés simple, par exemple `1d20`, `2d6` ou `1d100`.
- `/roll stat` : lance un jet influencé par une statistique active d'un personnage, avec un dé au choix comme `1d20`, `1d60`, `2d12` ou `1d100`.
- `/roll custom` : lance un jet libre avec un modificateur manuel.

`/roll stat` utilise uniquement les personnages actifs de l'utilisateur et les statistiques actives du serveur. Les options `character` et `statistic` proposent une autocomplétion. L'option `dice` est facultative et vaut `1d100` par défaut.

Le calcul de `/roll stat` fonctionne ainsi :

```text
maîtrise = valeur_du_personnage / valeur_maximum_de_la_statistique
résultat final = jet brut + modificateur de maîtrise adapté au dé choisi
```

Paliers de maîtrise :

- 0 % à 32 % : faible maîtrise, modificateur de base `-15`.
- 33 % à 66 % : maîtrise normale, modificateur de base `0`.
- 67 % à 100 % : bonne maîtrise, modificateur de base `+10`.

Les modificateurs et les seuils de difficulté sont adaptés à l'échelle du dé. Par exemple, sur `1d20`, une difficulté `normal` devient un seuil de `10`, car elle représente 50 % du maximum du jet.

Difficultés disponibles :

- `easy` : seuil 40.
- `normal` : seuil 50.
- `hard` : seuil 65.
- `very_hard` : seuil 80.

Les jets critiques sont calculés sur le jet brut :

- 1 à 5 : échec critique.
- 96 à 100 : réussite critique.

Après un `/roll stat`, le personnage a une chance sur cinq de gagner automatiquement `+1` dans une statistique active aléatoire qu'il possède déjà. La progression ne dépasse jamais la valeur maximale définie pour la statistique.

## Logs console

Le logger centralisé se trouve dans `src/utils/logger.js`.

Il ajoute automatiquement :

- un horodatage ;
- un niveau de log : `INFO`, `OKAY`, `WARN`, `ERROR` ;
- une source lisible : `BOT`, `COMMANDES`, `EVENEMENTS`, `DEPLOIEMENT`, `FIREBASE` ;
- des couleurs ANSI dans les terminaux compatibles ;
- des helpers de pluriel pour éviter les formulations artificielles avec parenthèses.

Les couleurs peuvent être désactivées avec `NO_COLOR=1` ou forcées avec `FORCE_COLOR=1`.

## Structure

```text
src/
  commands/
    developpeur/
      reload.js
    fun/
    moderation/
    roleplay/
      character.js
      config.js
      economy.js
      item.js
      roll.js
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
  modules/
    config/
      autocomplete.js
      builder.js
      items.js
      money.js
      shared.js
      statistics.js
    economy/
      autocomplete.js
      builder.js
      buttons.js
      constants.js
      embeds.js
      handlers.js
      shared.js
    item/
      autocomplete.js
      builder.js
      buttons.js
      constants.js
      embeds.js
      handlers.js
      shared.js
      shopView.js
    roll/
      autocomplete.js
      builder.js
      constants.js
      dice.js
      embeds.js
      handlers.js
      progression.js
      shared.js
    stats/
      autocomplete.js
      builder.js
      constants.js
      embeds.js
      handlers.js
      shared.js
  services/
    characterService.js
    economyService.js
    firebase.js
    shopService.js
    statisticsService.js
    webhookService.js
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
  name: "dire",
  description: "Répète un message.",
  category: "Utilitaires",
  usage: "/dire message:texte",
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
