'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientCommandManager } = require('../common/client_commands');
const { GuildConfigsManager } = require('../common/guild_configs');

//------------------------------------------------------------//

module.exports = {
    name: 'interactionCreate',
    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} interaction
     */
    async handler(discord_client, interaction) {
        if (interaction.isCommand()) {
            /** @type {Discord.CommandInteraction} */
            const command_interaction = interaction;
            console.log({ command_interaction });

            const command = ClientCommandManager.commands.get(command_interaction.commandName);
            if (!command) return;

            await command.handler(discord_client, command_interaction);
        }
    },
};
