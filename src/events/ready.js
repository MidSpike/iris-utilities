'use strict';

//------------------------------------------------------------//

const { ClientInteractionManager } = require('../common/app/client_interactions');
const { GuildConfigsManager } = require('../common/app/guild_configs');

//------------------------------------------------------------//

async function updateAllGuildConfigs(discord_client) {
    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> updating all guild configs...`);

    for (const [ guild_id ] of discord_client.guilds.cache) {
        await GuildConfigsManager.update(guild_id, {});
    }

    console.success(`<DC S#(${discord_client.shard.ids.join(', ')})> updated all guild configs.`);
}

//------------------------------------------------------------//

module.exports = {
    name: 'ready',
    /**
     * @param {import('discord.js').Client} discord_client
     */
    async handler(discord_client) {
        console.success(`<DC S#(${discord_client.shard.ids.join(', ')})> client is ready.`);

        discord_client.user.setPresence({
            activities: [
                {
                    name: 'slash commands!',
                    type: 2,
                },
            ],
        });

        /* update all guild configs */
        updateAllGuildConfigs(discord_client);

        /* load all client interactions */
        ClientInteractionManager.loadClientInteractions();
    },
};
