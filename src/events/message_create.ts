//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, DiscordClientWithSharding } from '@root/types';

import * as Discord from 'discord.js';

import urlBlockingHandler from '@root/handlers/url_blocking_handler';

import chatArtificialIntelligenceHandler from '@root/handlers/chat_ai_handler';

//------------------------------------------------------------//

const event_name = Discord.Events.MessageCreate;
export default {
    name: event_name,
    async handler(
        discord_client: DiscordClientWithSharding,
        message,
    ) {
        if (!discord_client.isReady()) return;

        if (message.author.bot) return; // don't respond to bots
        if (message.author.system) return; // don't respond to system messages

        /* run guild message handlers */
        if (message.inGuild()) {
            urlBlockingHandler(discord_client, message);
            chatArtificialIntelligenceHandler(discord_client, message);
        }
    },
} as ClientEventExport<typeof event_name>;
