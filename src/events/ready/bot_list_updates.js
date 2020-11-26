'use strict';

const blapi = require("blapi");

const { client } = require('../../libs/bot.js');

//---------------------------------------------------------------------------------------------------------------//

function postStatsToBotListingServices() {
    blapi.manualPost(client.guilds.cache.size, client.user.id, {
        'top.gg': process.env.BLS_TOP_GG_TOKEN,
        'bots.ondiscord.xyz': process.env.BLS_BOTS_ON_DISCORD_TOKEN,
        'discord.bots.gg': process.env.BLS_DISCORD_BOTS_GG_TOKEN,
        'arcane-center.xyz': process.env.BLS_ARCANE_CENTER_TOKEN,
        'discord.boats': process.env.BLS_DISCORD_BOATS_TOKEN,
        'discordextremelist.xyz': process.env.BLS_DISCORD_EXTREME_LIST,
    });
}

module.exports = {
    event_name: 'ready',
    async callback() {
        /* update the bot listing websites at the specified interval below */
        client.setInterval(() => postStatsToBotListingServices(), 1000 * 60 * 30); // every 30 minutes
    }
};
