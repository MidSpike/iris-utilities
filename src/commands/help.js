'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientCommand, ClientCommandHandlerOptions } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'help',
    aliases: ['help', 'h'],
    description: 'Displays a list of commands.',
    permissions: [
        Discord.Permissions.FLAGS.SEND_MESSAGES,
    ],
    contexts: [
        'ALL_CHANNELS',
    ],
    /**
     * @param {Discord.Message} message
     * @param {ClientCommandHandlerOptions} opts
     */
    async handler(message, opts) {
        message.reply({
            content: 'this is going to be the help command',
        });
    },
});
