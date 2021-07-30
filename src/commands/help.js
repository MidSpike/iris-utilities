'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'help',
    description: 'Displays a list of commands.',
    options: [
        {
            type: 'INTEGER',
            name: 'page-number',
            description: 'the page number',
            required: false,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    contexts: [
        'ALL_CHANNELS',
    ],
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        command_interaction.reply({
            content: 'this is going to be the help command',
            embeds: [
                {
                    title: 'This is a test!',
                },
            ],
        });
    },
});
