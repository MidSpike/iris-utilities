'use strict';

//------------------------------------------------------------//

import Typings from 'typings';

import Discord from 'discord.js';

import { GuildConfigsManager } from '../common/app/guild_configs';

import { MusicReconnaissance } from '../common/app/music/music';

//------------------------------------------------------------//

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

const event_name = Discord.Constants.Events.CLIENT_READY;
export default {
    name: event_name,
    async handler(
        discord_client: DiscordClientWithSharding,
    ) {
        console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> client is ready.`);

        discord_client.user.setPresence({
            activities: [
                {
                    name: 'slash commands!',
                    type: 2,
                },
            ],
        });

        // Initialize the MusicReconnaissance service with the client
        MusicReconnaissance.initialize(discord_client);

        /* update all guild configs */
        setTimeout(() => {
            updateAllGuildConfigs(discord_client);
        }, 30_000); // 30 seconds
    },
} as Typings.ClientEventExport<typeof event_name>;
