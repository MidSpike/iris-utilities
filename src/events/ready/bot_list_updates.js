'use strict';

//---------------------------------------------------------------------------------------------------------------//

const axios = require('axios');

const { Timer } = require('../../utilities.js');

const { client } = require('../../libs/discord_client.js');

//---------------------------------------------------------------------------------------------------------------//

async function postStatsToBotListingServices() {
    const distributed_guild_count = await client.shard.fetchClientValues('guilds.cache.size');
    const total_guild_count = distributed_guild_count.reduce((accumulator, guild_count) => accumulator + guild_count, 0);

    const server_count = total_guild_count;
    const bot_id = client.user.id;
    const shard_id = client.$._shard_id;
    const shard_count = client.shard.count;
    const shards = client.shard.ids;

    try {
        await axios({
            method: 'post',
            url: 'https://botblock.org/api/count',
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                'server_count': server_count,
                'bot_id': bot_id,
                'shard_id': shard_id,
                'shard_count': shard_count,
                'shards': shards,

                'top.gg': process.env.BLS_TOP_GG_TOKEN,
                'bots.ondiscord.xyz': process.env.BLS_BOTS_ON_DISCORD_TOKEN,
                'discord.bots.gg': process.env.BLS_DISCORD_BOTS_GG_TOKEN,
                // 'arcane-center.xyz': process.env.BLS_ARCANE_CENTER_TOKEN,
                'discord.boats': process.env.BLS_DISCORD_BOATS_TOKEN,
                'discordextremelist.xyz': process.env.BLS_DISCORD_EXTREME_LIST,
                'discordbotlist.com': process.env.BLS_DISCORD_BOT_LIST,
            },
        });
    } catch (error) {
        console.trace('postStatsToBotListingServices', error);
    }
}

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'ready',
    async callback() {
        /* make sure that the client has been assigned a shard id before continuing */
        while (client.$._shard_id === undefined) {
            await Timer(125);
        }

        /* update the bot listing websites at the specified intervals below */
        if (client.$._shard_id === 0) {
            client.setTimeout(async () => await postStatsToBotListingServices(), 2 * 60_000); // after 2 minutes
            client.setInterval(async () => await postStatsToBotListingServices(), 1000 * 60 * 30); // every 30 minutes
        }
    },
};
