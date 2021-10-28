'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { ClientCommand, ClientCommandHandler } = require('../../../common/app/client_commands');
const { joinVoiceChannel } = require('@discordjs/voice');

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

        const voice_channel = command_interaction.member?.voice.channel;
        if (!voice_channel) return;

        joinVoiceChannel({
            channelId: voice_channel.id,
            guildId: voice_channel.guild.id,
            adapterCreator: voice_channel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        await command_interaction.followUp({
            content: `${command_interaction.member}, did the test!`,
        }).catch(console.warn);
    },
});
