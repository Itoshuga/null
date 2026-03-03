const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_LANGUAGE = "fr_FR";
const LOCALES_PATH = path.join(__dirname, "..", "locales");
const STORE_PATH = path.join(__dirname, "..", "data", "languages.json");

function ensureStoreFile() {
    const dir = path.dirname(STORE_PATH);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(STORE_PATH)) {
        fs.writeFileSync(STORE_PATH, "{}", "utf8");
    }
}

function readStore() {
    ensureStoreFile();

    try {
        const raw = fs.readFileSync(STORE_PATH, "utf8");
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? data : {};
    } catch {
        return {};
    }
}

function writeStore(store) {
    ensureStoreFile();
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function loadLocales() {
    const locales = {};

    if (!fs.existsSync(LOCALES_PATH)) {
        return locales;
    }

    const files = fs.readdirSync(LOCALES_PATH, { withFileTypes: true });

    for (const file of files) {
        if (!file.isFile() || !file.name.endsWith(".json")) continue;

        const localeCode = path.basename(file.name, ".json");
        const filePath = path.join(LOCALES_PATH, file.name);

        try {
            const raw = fs.readFileSync(filePath, "utf8");
            const content = JSON.parse(raw);

            if (content && typeof content === "object") {
                locales[localeCode] = content;
            }
        } catch {
            continue;
        }
    }

    return locales;
}

function getScopeId(interaction) {
    return interaction.guildId || `dm:${interaction.user.id}`;
}

function formatMessage(template, variables = {}) {
    return Object.entries(variables).reduce(
        (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
        template,
    );
}

function createI18n() {
    const store = readStore();
    const locales = loadLocales();
    const supportedLanguages = Object.keys(locales);

    function getLanguage(interaction) {
        const scopedLanguage = store[getScopeId(interaction)];
        return supportedLanguages.includes(scopedLanguage) ? scopedLanguage : DEFAULT_LANGUAGE;
    }

    function setLanguage(interaction, language) {
        const nextLanguage = supportedLanguages.includes(language) ? language : DEFAULT_LANGUAGE;
        store[getScopeId(interaction)] = nextLanguage;
        writeStore(store);
        return nextLanguage;
    }

    function t(interaction, key, variables) {
        const language = getLanguage(interaction);
        const template = key
            .split(".")
            .reduce((current, part) => current?.[part], locales[language]);

        if (!template) {
            return key;
        }

        return typeof template === "string" ? formatMessage(template, variables) : template;
    }

    return {
        DEFAULT_LANGUAGE,
        SUPPORTED_LANGUAGES: supportedLanguages,
        getLanguage,
        setLanguage,
        t,
    };
}

module.exports = {
    createI18n,
};
