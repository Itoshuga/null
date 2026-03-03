const { EmbedBuilder } = require("discord.js");

const COSMIC_COLORS = Object.freeze({
    ABYSS: 0x000000,
    STARLIGHT: 0xffffff,
    MIST: 0x2b2b2b,
});

function createCosmicEmbed({ title, description, accent = COSMIC_COLORS.MIST }) {
    return new EmbedBuilder()
        .setColor(accent)
        .setTitle(title)
        .setDescription(description);
}

module.exports = {
    COSMIC_COLORS,
    createCosmicEmbed,
};