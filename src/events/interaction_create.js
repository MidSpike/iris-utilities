'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientInteractionManager } = require('../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = {
    name: 'interactionCreate',
    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} unknown_interaction
     */
    async handler(discord_client, unknown_interaction) {
        await ClientInteractionManager.handleUnknownInteraction(discord_client, unknown_interaction);
    },
};
