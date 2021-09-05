'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { Track } = require('discord-player');

const { AudioManager } = require('../../../common/app/audio');
const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    type: 'CHAT_INPUT',
    name: 'test',
    description: 'n/a',
    category: ClientCommand.categories.get('BOT_SUPER'),
    options: [],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
        Discord.Permissions.FLAGS.CONNECT,
        Discord.Permissions.FLAGS.SPEAK,
    ],
    context: 'GUILD_COMMAND',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.deferReply();

        command_interaction.followUp({
            content: `${command_interaction.user}, did the test!`,
        });
    },
});
