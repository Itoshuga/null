/**
 * Logger centralisé du bot.
 * Il ajoute un horodatage, un niveau coloré et une source claire à chaque message.
 */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const levels = {
  info: {
    label: "INFO",
    color: colors.cyan,
    output: console.log,
  },
  success: {
    label: "OKAY",
    color: colors.green,
    output: console.log,
  },
  warning: {
    label: "WARN",
    color: colors.yellow,
    output: console.warn,
  },
  error: {
    label: "NOPE",
    color: colors.red,
    output: console.error,
  },
};

const sourceColors = {
  BOT: colors.magenta,
  COMMANDES: colors.blue,
  EVENEMENTS: colors.cyan,
  DEPLOIEMENT: colors.yellow,
  FIREBASE: colors.green,
  GUILD: colors.magenta,
  INTERACTIONS: colors.cyan,
};

function shouldUseColors() {
  if (process.env.NO_COLOR) {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return true;
  }

  return Boolean(process.stdout.isTTY);
}

function colorize(text, color) {
  if (!shouldUseColors()) {
    return text;
  }

  return `${color}${text}${colors.reset}`;
}

function formatTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatBadge(text, color) {
  return colorize(`[${text}]`, color);
}

function formatLine(level, source, message) {
  const levelConfig = levels[level];
  const timestamp = colorize(formatTimestamp(), colors.gray);
  const levelBadge = formatBadge(levelConfig.label, levelConfig.color);
  const sourceBadge = formatBadge(source, sourceColors[source] || colors.bold);

  return `${timestamp} ${levelBadge} ${sourceBadge} ${message}`;
}

function write(level, source, message, error) {
  const levelConfig = levels[level];

  levelConfig.output(formatLine(level, source, message));

  if (error) {
    levelConfig.output(error);
  }
}

function info(source, message) {
  write("info", source, message);
}

function success(source, message) {
  write("success", source, message);
}

function warning(source, message) {
  write("warning", source, message);
}

function error(source, message, error) {
  write("error", source, message, error);
}

/**
 * Retourne le singulier ou le pluriel selon le nombre.
 * Par convention du projet, le pluriel commence uniquement au-dessus de 1.
 */
function pluralize(count, singular, plural = `${singular}s`) {
  return count > 1 ? plural : singular;
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${pluralize(count, singular, plural)}`;
}

module.exports = {
  info,
  success,
  warning,
  error,
  pluralize,
  formatCount,
};
