function getDb() {
  return require("./firebase").db;
}

function getFieldValue() {
  return require("./firebase").admin.firestore.FieldValue;
}

/**
 * Retourne la collection Firestore des personnages RP d'un serveur.
 * Chemin final : /guilds/{GUILD_ID}/characters/{CHARACTER_ID}
 */
function getCharactersCollection(guildId) {
  return getDb().collection("guilds").doc(guildId).collection("characters");
}

/**
 * Génère un identifiant lisible à partir du nom du personnage.
 * Exemple : "Isen du Nord" devient "isen-du-nord".
 */
function createCharacterId(name) {
  return name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProxy(proxy) {
  return proxy.trim().toLowerCase();
}

async function getCharacter(guildId, characterId, options = {}) {
  const snapshot = await getCharactersCollection(guildId).doc(characterId).get();

  if (!snapshot.exists) {
    return null;
  }

  const character = snapshot.data();

  if (!options.includeDeleted && character.isDeleted) {
    return null;
  }

  return character;
}

async function listCharactersByOwner(guildId, ownerId, options = {}) {
  const snapshot = await getCharactersCollection(guildId)
    .where("ownerId", "==", ownerId)
    .get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((character) => options.includeDeleted || !character.isDeleted)
    .sort((firstCharacter, secondCharacter) => {
      return firstCharacter.name.localeCompare(secondCharacter.name, "fr");
    });
}

async function listCharacters(guildId, options = {}) {
  const snapshot = await getCharactersCollection(guildId).get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((character) => options.includeDeleted || !character.isDeleted)
    .filter((character) => options.includeInactive || character.isActive !== false)
    .sort((firstCharacter, secondCharacter) => {
      return firstCharacter.name.localeCompare(secondCharacter.name, "fr");
    });
}

async function countActiveCharactersByOwner(guildId, ownerId) {
  const characters = await listCharactersByOwner(guildId, ownerId);

  return characters.filter((character) => character.isActive !== false).length;
}

async function findCharacterByProxy(guildId, proxy) {
  const snapshot = await getCharactersCollection(guildId)
    .where("proxy", "==", normalizeProxy(proxy))
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const character = snapshot.docs[0].data();

  if (character.isDeleted || character.isActive === false) {
    return null;
  }

  return character;
}

async function isProxyAvailable(guildId, proxy, ignoredCharacterId = null) {
  const character = await findCharacterByProxy(guildId, proxy);

  return !character || character.id === ignoredCharacterId;
}

async function createCharacter(guildId, characterData) {
  await getCharactersCollection(guildId).doc(characterData.id).set(characterData);
}

async function updateCharacter(guildId, characterId, updatedData) {
  await getCharactersCollection(guildId).doc(characterId).update(updatedData);
}

async function setCharacterStatistic(guildId, characterId, statisticId, value, userId) {
  const now = new Date().toISOString();

  await getCharactersCollection(guildId).doc(characterId).update({
    [`statistics.${statisticId}`]: value,
    updatedAt: now,
    updatedBy: userId,
  });
}

async function removeCharacterStatistic(guildId, characterId, statisticId, userId) {
  const now = new Date().toISOString();

  await getCharactersCollection(guildId).doc(characterId).update({
    [`statistics.${statisticId}`]: getFieldValue().delete(),
    updatedAt: now,
    updatedBy: userId,
  });
}

async function softDeleteCharacter(guildId, characterId, deletionData) {
  await getCharactersCollection(guildId).doc(characterId).update({
    isActive: false,
    isDeleted: true,
    deletedAt: deletionData.deletedAt,
    deletedBy: deletionData.deletedBy,
    updatedAt: deletionData.deletedAt,
    updatedBy: deletionData.deletedBy,
  });
}

/**
 * Ajoute une nouvelle statistique aux personnages actifs qui ne la possèdent pas encore.
 * Cette synchronisation garde les personnages cohérents après un /config stats create.
 */
async function addStatisticToActiveCharacters(guildId, statisticId, defaultValue) {
  const snapshot = await getCharactersCollection(guildId).get();
  const now = new Date().toISOString();
  const updates = [];

  for (const document of snapshot.docs) {
    const character = document.data();

    if (character.isDeleted || character.isActive === false || character.statistics?.[statisticId] !== undefined) {
      continue;
    }

    updates.push(
      document.ref.update({
        [`statistics.${statisticId}`]: defaultValue,
        updatedAt: now,
      }),
    );
  }

  await Promise.all(updates);

  return updates.length;
}

module.exports = {
  addStatisticToActiveCharacters,
  countActiveCharactersByOwner,
  createCharacter,
  createCharacterId,
  findCharacterByProxy,
  getCharacter,
  isProxyAvailable,
  listCharacters,
  listCharactersByOwner,
  normalizeProxy,
  removeCharacterStatistic,
  setCharacterStatistic,
  softDeleteCharacter,
  updateCharacter,
};
