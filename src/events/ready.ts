//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from '@root/types/index';

import * as Discord from 'discord.js';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

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

        /* update all guild configs */
        setTimeout(() => {
            updateAllGuildConfigs(discord_client);
        }, 60_000); // 60 seconds
    },
} as ClientEventExport<typeof event_name>;
