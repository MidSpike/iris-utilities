//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from 'typings';

import * as Discord from 'discord.js';

import { ClientInteractionManager } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

const event_name = Discord.Events.InteractionCreate;
export default {
    name: event_name,
    async handler(
        discord_client,
        unknown_interaction,
    ) {
        if (!discord_client.isReady()) return;

        await ClientInteractionManager.handleUnknownInteraction(discord_client, unknown_interaction);
    },
} as ClientEventExport<typeof event_name>;
