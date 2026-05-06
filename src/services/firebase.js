const fs = require("fs");
const admin = require("firebase-admin");

const botConfig = require("../config/botConfig");
const logger = require("../utils/logger");

/**
 * Lit le fichier JSON du compte de service Firebase.
 * Ce fichier contient des secrets et doit rester ignoré par Git.
 */
function readServiceAccount() {
  const serviceAccountPath = botConfig.firebase.serviceAccountPath;

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      `Le fichier Firebase est introuvable : ${serviceAccountPath}. Créez-le depuis firebase-service-account.example.json.`,
    );
  }

  try {
    return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  } catch (error) {
    throw new Error(`Le fichier Firebase n'est pas un JSON valide : ${serviceAccountPath}. Erreur : ${error.message}`);
  }
}

/**
 * Initialise Firebase Admin et retourne l'accès Firestore.
 * admin.apps évite une double initialisation si le fichier est importé plusieurs fois.
 */
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccount = readServiceAccount();
  const projectId = botConfig.firebase.projectId || serviceAccount.project_id;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID est manquant et project_id est absent du compte de service.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });

  const db = admin.firestore();
  logger.success("FIREBASE", "Connexion à Firestore réussie.");

  return db;
}

const db = initializeFirebase();

module.exports = {
  admin,
  db,
};
