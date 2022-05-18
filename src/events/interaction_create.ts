'use strict';

//------------------------------------------------------------//

import Discord from 'discord.js';

import { ClientInteractionManager } from '../common/app/client_interactions';

//------------------------------------------------------------//

export default {
    name: 'interactionCreate',
    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} unknown_interaction
     */
    async handler(discord_client: Discord.Client, unknown_interaction: Discord.Interaction<'cached'>) {
        await ClientInteractionManager.handleUnknownInteraction(discord_client, unknown_interaction);
    },
};
