//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from 'typings';

import * as Discord from 'discord.js';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

import { MusicReconnaissance } from '@root/common/app/music/music';

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

const event_name = Discord.Events.ClientReady;
export default {
    name: event_name,
    async handler(
        discord_client: DiscordClientWithSharding,
    ) {
        console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> client is ready.`);

        discord_client.user.setPresence({
            status: 'online',
            activities: [
                {
                    type: Discord.ActivityType.Listening,
                    name: 'slash commands!',
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
} as ClientEventExport<typeof event_name>;
