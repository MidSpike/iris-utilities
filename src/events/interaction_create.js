'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientCommandManager } = require('../common/app/client_commands');

//------------------------------------------------------------//

module.exports = {
    name: 'interactionCreate',
    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} unknown_interaction
     */
    async handler(discord_client, unknown_interaction) {
        if (unknown_interaction.isCommand() || unknown_interaction.isContextMenu()) {
            /** @type {Discord.CommandInteraction | Discord.ContextMenuInteraction} */
            const interaction = unknown_interaction;
            console.log({ interaction });

            const command = ClientCommandManager.commands.get(interaction.commandName);
            if (!command) return;

            await command.handler(discord_client, interaction);
        }
    },
};
