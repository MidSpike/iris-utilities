'use strict';

//------------------------------------------------------------//

import Typings from 'typings';

import * as Discord from 'discord.js';

import { ClientInteractionManager } from '../common/app/client_interactions';

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
} as Typings.ClientEventExport<typeof event_name>;
