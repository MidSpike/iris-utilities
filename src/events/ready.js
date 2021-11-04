'use strict';

//------------------------------------------------------------//

const { ClientInteractionManager } = require('../common/app/client_interactions');
const { GuildConfigsManager } = require('../common/app/guild_configs');

//------------------------------------------------------------//

async function updateAllGuildConfigs(discord_client) {
    console.info(`<DC S#(${discord_client.shard.id})> updating all guild configs...`);

    for (const [ guild_id ] of discord_client.guilds.cache) {
        await GuildConfigsManager.update(guild_id, {});
    }

    console.success(`<DC S#(${discord_client.shard.id})> updated all guild configs.`);
}

//------------------------------------------------------------//

module.exports = {
    name: 'ready',
    async handler(discord_client) {
        console.success(`<DC S#(${discord_client.shard.id})> client is ready.`);

        /* update all guild configs */
        updateAllGuildConfigs(discord_client);

        /* load all client interactions */
        ClientInteractionManager.loadClientInteractions();
    },
};
