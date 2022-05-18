'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { GuildConfigsManager } from '../common/app/guild_configs';

type DiscordClientWithSharding = Discord.Client<true> & {
    shard: Discord.ShardClientUtil;
};

//------------------------------------------------------------//

async function updateAllGuildConfigs(discord_client: DiscordClientWithSharding) {
    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> updating all guild configs...`);

    for (const [ guild_id ] of discord_client.guilds.cache) {
        await GuildConfigsManager.update(guild_id);
    }

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> updated all guild configs.`);
}

//------------------------------------------------------------//

export default {
    name: 'ready',
    async handler(discord_client: DiscordClientWithSharding) {
        console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> client is ready.`);

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
    },
};
