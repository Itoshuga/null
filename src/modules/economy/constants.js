const ECONOMY_COLOR = 0xf2f4f8;
const ECONOMY_COMPONENT_PREFIX = "economy:";
const TRANSACTIONS_BUTTON_PREFIX = `${ECONOMY_COMPONENT_PREFIX}tx:`;
const BUTTON_CONTEXT_TTL_MS = 15 * 60 * 1000;
const MAX_STANDARD_AMOUNT = 1_000_000;
const MAX_PAYMENT_AMOUNT = 100_000;
const TRANSACTIONS_LIMIT = 10;

const WORK_MESSAGES = [
  "[characterName] a fait de la manutention en intérim et gagne [money].",
  "[characterName] a livré des colis toute la journée et gagne [money].",
  "[characterName] a aidé à décharger un camion et repart avec [money].",
  "[characterName] a nettoyé un entrepôt et gagne [money].",
  "[characterName] a travaillé sur un chantier et reçoit [money].",
  "[characterName] a fait quelques heures comme serveur et gagne [money].",
  "[characterName] a remplacé un employé absent au dernier moment et empoche [money].",
  "[characterName] a distribué des flyers en ville et gagne [money].",
  "[characterName] a fait du ménage dans des bureaux et reçoit [money].",
  "[characterName] a aidé un commerçant à ranger sa réserve et gagne [money].",
  "[characterName] a gardé l'entrée d'un événement privé et repart avec [money].",
  "[characterName] a fait des livraisons à vélo et gagne [money].",
  "[characterName] a travaillé comme plongeur dans un restaurant et reçoit [money].",
  "[characterName] a monté des meubles pour un particulier et gagne [money].",
  "[characterName] a aidé à préparer une salle pour un événement et empoche [money].",
  "[characterName] a fait l'inventaire dans un magasin et gagne [money].",
  "[characterName] a lavé des voitures toute l'après-midi et reçoit [money].",
  "[characterName] a réparé quelques bricoles chez un voisin et gagne [money].",
  "[characterName] a porté des cartons pendant des heures et repart avec [money].",
  "[characterName] a aidé au déménagement d'un client et gagne [money].",
  "[characterName] a travaillé dans une supérette pour la journée et reçoit [money].",
  "[characterName] a rangé des rayons dans un magasin et gagne [money].",
  "[characterName] a préparé des commandes dans un entrepôt et empoche [money].",
  "[characterName] a fait la plonge après un gros service et gagne [money].",
  "[characterName] a gardé des enfants quelques heures et reçoit [money].",
  "[characterName] a promené des chiens dans le quartier et gagne [money].",
  "[characterName] a arrosé les plantes d'un voisin absent et repart avec [money].",
  "[characterName] a aidé un artisan sur un petit chantier et gagne [money].",
  "[characterName] a trié des colis dans un dépôt et reçoit [money].",
  "[characterName] a fait du soutien scolaire et gagne [money].",
];

module.exports = {
  BUTTON_CONTEXT_TTL_MS,
  ECONOMY_COLOR,
  ECONOMY_COMPONENT_PREFIX,
  MAX_PAYMENT_AMOUNT,
  MAX_STANDARD_AMOUNT,
  TRANSACTIONS_BUTTON_PREFIX,
  TRANSACTIONS_LIMIT,
  WORK_MESSAGES,
};
