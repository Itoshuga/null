const DEFAULT_ECONOMY_SETTINGS = {
  allowSelfCharacterPayments: true,
  bankEnabled: true,
  currencyName: "Yen",
  currencySymbol: "¥",
  startingBank: 0,
  startingWallet: 0,
  transactionsEnabled: true,
  workCooldownHours: 6,
  workEnabled: true,
  workMaxReward: 2000,
  workMinReward: 1000,
};

class EconomyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "EconomyError";
    this.code = code;
    this.details = details;
  }
}

function getDb() {
  return require("./firebase").db;
}

function getGuildDocument(guildId) {
  return getDb().collection("guilds").doc(guildId);
}

function getCharactersCollection(guildId) {
  return getGuildDocument(guildId).collection("characters");
}

function getTransactionsCollection(guildId) {
  return getGuildDocument(guildId).collection("transactions");
}

function getEconomySettingsDocument(guildId) {
  return getGuildDocument(guildId).collection("settings").doc("economy");
}

async function getEconomySettings(guildId) {
  const snapshot = await getEconomySettingsDocument(guildId).get();

  if (!snapshot.exists) {
    return { ...DEFAULT_ECONOMY_SETTINGS };
  }

  return {
    ...DEFAULT_ECONOMY_SETTINGS,
    ...snapshot.data(),
  };
}

function createInitialEconomy(settings = DEFAULT_ECONOMY_SETTINGS) {
  return {
    bank: sanitizeAmount(settings.startingBank),
    lastWorkAt: null,
    wallet: sanitizeAmount(settings.startingWallet),
  };
}

function normalizeEconomy(economy = {}, settings = DEFAULT_ECONOMY_SETTINGS) {
  return {
    bank: sanitizeAmount(economy.bank ?? settings.startingBank),
    lastWorkAt: economy.lastWorkAt || null,
    wallet: sanitizeAmount(economy.wallet ?? settings.startingWallet),
  };
}

async function work(guildId, characterId, userId) {
  const settings = await getEconomySettings(guildId);

  if (!settings.workEnabled) {
    throw new EconomyError("work_disabled", "Le travail est désactivé sur ce serveur.");
  }

  const reward = randomBetween(settings.workMinReward, settings.workMaxReward);
  const characterRef = getCharactersCollection(guildId).doc(characterId);

  return getDb().runTransaction(async (transaction) => {
    const character = await readUsableCharacter(transaction, characterRef);

    assertCharacterOwner(character, userId);

    const economy = normalizeEconomy(character.economy, settings);
    const now = new Date();
    const nextWorkAt = getNextWorkDate(economy.lastWorkAt, settings.workCooldownHours);

    if (nextWorkAt && nextWorkAt > now) {
      throw new EconomyError("work_cooldown", "Ce personnage ne peut pas encore retravailler.", {
        remainingMs: nextWorkAt.getTime() - now.getTime(),
      });
    }

    const updatedEconomy = {
      ...economy,
      lastWorkAt: now.toISOString(),
      wallet: economy.wallet + reward,
    };

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt: updatedEconomy.lastWorkAt,
      updatedBy: userId,
    });

    createTransaction(transaction, guildId, settings, {
      amount: reward,
      characterId: character.id,
      characterName: character.name,
      characterIds: [character.id],
      type: "work",
      userId,
    });

    return {
      amount: reward,
      character,
      economy: updatedEconomy,
      nextWorkAt: getNextWorkDate(updatedEconomy.lastWorkAt, settings.workCooldownHours),
      settings,
    };
  });
}

async function deposit(guildId, characterId, userId, amount) {
  validatePositiveAmount(amount);

  const settings = await getEconomySettings(guildId);

  if (!settings.bankEnabled) {
    throw new EconomyError("bank_disabled", "La banque est désactivée sur ce serveur.");
  }

  const characterRef = getCharactersCollection(guildId).doc(characterId);

  return getDb().runTransaction(async (transaction) => {
    const character = await readUsableCharacter(transaction, characterRef);

    assertCharacterOwner(character, userId);

    const economy = normalizeEconomy(character.economy, settings);

    if (economy.wallet < amount) {
      throw new EconomyError("not_enough_wallet", "Ce personnage n'a pas assez d'argent sur lui.");
    }

    const updatedAt = new Date().toISOString();
    const updatedEconomy = {
      ...economy,
      bank: economy.bank + amount,
      wallet: economy.wallet - amount,
    };

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt,
      updatedBy: userId,
    });

    createTransaction(transaction, guildId, settings, {
      amount,
      characterId: character.id,
      characterName: character.name,
      characterIds: [character.id],
      from: "wallet",
      to: "bank",
      type: "deposit",
      userId,
    });

    return {
      amount,
      character,
      economy: updatedEconomy,
      settings,
    };
  });
}

async function withdraw(guildId, characterId, userId, amount) {
  validatePositiveAmount(amount);

  const settings = await getEconomySettings(guildId);

  if (!settings.bankEnabled) {
    throw new EconomyError("bank_disabled", "La banque est désactivée sur ce serveur.");
  }

  const characterRef = getCharactersCollection(guildId).doc(characterId);

  return getDb().runTransaction(async (transaction) => {
    const character = await readUsableCharacter(transaction, characterRef);

    assertCharacterOwner(character, userId);

    const economy = normalizeEconomy(character.economy, settings);

    if (economy.bank < amount) {
      throw new EconomyError("not_enough_bank", "Ce personnage n'a pas assez d'argent en banque.");
    }

    const updatedAt = new Date().toISOString();
    const updatedEconomy = {
      ...economy,
      bank: economy.bank - amount,
      wallet: economy.wallet + amount,
    };

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt,
      updatedBy: userId,
    });

    createTransaction(transaction, guildId, settings, {
      amount,
      characterId: character.id,
      characterName: character.name,
      characterIds: [character.id],
      from: "bank",
      to: "wallet",
      type: "withdraw",
      userId,
    });

    return {
      amount,
      character,
      economy: updatedEconomy,
      settings,
    };
  });
}

async function payment(guildId, fromCharacterId, toCharacterId, userId, amount, reason = null) {
  validatePositiveAmount(amount);

  if (fromCharacterId === toCharacterId) {
    throw new EconomyError("same_character", "Un personnage ne peut pas se payer lui-même.");
  }

  const settings = await getEconomySettings(guildId);
  const fromCharacterRef = getCharactersCollection(guildId).doc(fromCharacterId);
  const toCharacterRef = getCharactersCollection(guildId).doc(toCharacterId);

  return getDb().runTransaction(async (transaction) => {
    const fromCharacter = await readUsableCharacter(transaction, fromCharacterRef);
    const toCharacter = await readUsableCharacter(transaction, toCharacterRef);

    assertCharacterOwner(fromCharacter, userId);

    if (!settings.allowSelfCharacterPayments && fromCharacter.ownerId === toCharacter.ownerId) {
      throw new EconomyError("self_payment_disabled", "Les paiements entre tes propres personnages sont désactivés sur ce serveur.");
    }

    const fromEconomy = normalizeEconomy(fromCharacter.economy, settings);
    const toEconomy = normalizeEconomy(toCharacter.economy, settings);

    if (fromEconomy.wallet < amount) {
      throw new EconomyError("not_enough_wallet", "Le personnage envoyeur n'a pas assez d'argent sur lui.");
    }

    const updatedAt = new Date().toISOString();
    const updatedFromEconomy = {
      ...fromEconomy,
      wallet: fromEconomy.wallet - amount,
    };
    const updatedToEconomy = {
      ...toEconomy,
      wallet: toEconomy.wallet + amount,
    };

    transaction.update(fromCharacterRef, {
      "economy.bank": updatedFromEconomy.bank,
      "economy.lastWorkAt": updatedFromEconomy.lastWorkAt,
      "economy.wallet": updatedFromEconomy.wallet,
      updatedAt,
      updatedBy: userId,
    });
    transaction.update(toCharacterRef, {
      "economy.bank": updatedToEconomy.bank,
      "economy.lastWorkAt": updatedToEconomy.lastWorkAt,
      "economy.wallet": updatedToEconomy.wallet,
      updatedAt,
      updatedBy: userId,
    });

    createTransaction(transaction, guildId, settings, {
      amount,
      characterIds: [fromCharacter.id, toCharacter.id],
      fromCharacterId: fromCharacter.id,
      fromCharacterName: fromCharacter.name,
      fromUserId: fromCharacter.ownerId,
      reason,
      toCharacterId: toCharacter.id,
      toCharacterName: toCharacter.name,
      toUserId: toCharacter.ownerId,
      type: "payment",
    });

    return {
      amount,
      fromCharacter,
      fromEconomy: updatedFromEconomy,
      reason,
      settings,
      toCharacter,
      toEconomy: updatedToEconomy,
    };
  });
}

async function adminGive(guildId, characterId, staffUserId, amount, reason = null) {
  validatePositiveAmount(amount);

  const settings = await getEconomySettings(guildId);
  const characterRef = getCharactersCollection(guildId).doc(characterId);

  return getDb().runTransaction(async (transaction) => {
    const character = await readUsableCharacter(transaction, characterRef);
    const economy = normalizeEconomy(character.economy, settings);
    const updatedAt = new Date().toISOString();
    const updatedEconomy = {
      ...economy,
      wallet: economy.wallet + amount,
    };

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt,
      updatedBy: staffUserId,
    });

    createTransaction(transaction, guildId, settings, {
      amount,
      characterId: character.id,
      characterIds: [character.id],
      characterName: character.name,
      reason,
      staffUserId,
      type: "admin_add",
      userId: character.ownerId,
    });

    return {
      amount,
      character,
      economy: updatedEconomy,
      reason,
      settings,
    };
  });
}

async function adminRemove(guildId, characterId, staffUserId, amount, reason = null) {
  validatePositiveAmount(amount);

  const settings = await getEconomySettings(guildId);
  const characterRef = getCharactersCollection(guildId).doc(characterId);

  return getDb().runTransaction(async (transaction) => {
    const character = await readUsableCharacter(transaction, characterRef);
    const economy = normalizeEconomy(character.economy, settings);

    if (economy.wallet < amount) {
      throw new EconomyError("not_enough_wallet", "Ce personnage n'a pas assez d'argent sur lui.");
    }

    const updatedAt = new Date().toISOString();
    const updatedEconomy = {
      ...economy,
      wallet: economy.wallet - amount,
    };

    transaction.update(characterRef, {
      "economy.bank": updatedEconomy.bank,
      "economy.lastWorkAt": updatedEconomy.lastWorkAt,
      "economy.wallet": updatedEconomy.wallet,
      updatedAt,
      updatedBy: staffUserId,
    });

    createTransaction(transaction, guildId, settings, {
      amount,
      characterId: character.id,
      characterIds: [character.id],
      characterName: character.name,
      reason,
      staffUserId,
      type: "admin_remove",
      userId: character.ownerId,
    });

    return {
      amount,
      character,
      economy: updatedEconomy,
      reason,
      settings,
    };
  });
}

async function listTransactions(guildId, characterId, limit = 10) {
  const snapshot = await getTransactionsCollection(guildId)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((transaction) => transaction.characterIds?.includes(characterId))
    .slice(0, limit);
}

async function readUsableCharacter(transaction, characterRef) {
  const snapshot = await transaction.get(characterRef);

  if (!snapshot.exists) {
    throw new EconomyError("character_not_found", "Ce personnage est introuvable.");
  }

  const character = snapshot.data();

  if (character.isDeleted || character.isActive === false) {
    throw new EconomyError("character_unavailable", "Ce personnage est supprimé ou inactif.");
  }

  return character;
}

function assertCharacterOwner(character, userId) {
  if (character.ownerId !== userId) {
    throw new EconomyError("not_owner", "Tu ne peux utiliser que tes propres personnages.");
  }
}

function createTransaction(transaction, guildId, settings, transactionData) {
  if (!settings.transactionsEnabled) {
    return;
  }

  const transactionId = createTransactionId();
  const createdAt = new Date().toISOString();
  const transactionRef = getTransactionsCollection(guildId).doc(transactionId);

  transaction.set(transactionRef, {
    currency: settings.currencySymbol,
    id: transactionId,
    reason: null,
    ...transactionData,
    createdAt,
  });
}

function createTransactionId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);

  return `${timestamp}-${randomPart}`;
}

function getNextWorkDate(lastWorkAt, cooldownHours) {
  if (!lastWorkAt) {
    return null;
  }

  const lastWorkDate = new Date(lastWorkAt);

  if (Number.isNaN(lastWorkDate.getTime())) {
    return null;
  }

  return new Date(lastWorkDate.getTime() + cooldownHours * 60 * 60 * 1000);
}

function validatePositiveAmount(amount) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new EconomyError("invalid_amount", "Le montant doit être un nombre entier supérieur à 0.");
  }
}

function sanitizeAmount(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function randomBetween(minimum, maximum) {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

module.exports = {
  EconomyError,
  adminGive,
  adminRemove,
  createInitialEconomy,
  deposit,
  getEconomySettings,
  listTransactions,
  normalizeEconomy,
  payment,
  withdraw,
  work,
};
