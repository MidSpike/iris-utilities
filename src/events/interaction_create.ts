//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport, DiscordClientWithSharding } from '@root/types';

import * as Discord from 'discord.js';

import { ClientInteractionManager } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const event_name = Discord.Events.InteractionCreate;
export default {
    name: event_name,
    async handler(
        discord_client: DiscordClientWithSharding,
        unknown_interaction,
    ) {
        if (!discord_client.isReady()) return;
        if (!discord_client.shard) return;

        void ClientInteractionManager.handleUnknownInteraction(discord_client, unknown_interaction);
    },
} as ClientEventExport<typeof event_name>;
