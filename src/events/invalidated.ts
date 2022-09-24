//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, DiscordClientWithSharding } from '@root/types';

import process from 'node:process';

import * as Discord from 'discord.js';

//------------------------------------------------------------//

const event_name = Discord.Events.Invalidated;
export default {
    name: event_name,
    async handler(discord_client: DiscordClientWithSharding) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> Client invalidated, shutting down...`);

        process.exit(1);
    },
} as ClientEventExport<typeof event_name>;
