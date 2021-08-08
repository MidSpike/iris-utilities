'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueueRepeatMode } = require('discord-player');

const { AudioManager } = require('../common/audio_player');
const { ClientCommand, ClientCommandHandler } = require('../common/client_commands');

//------------------------------------------------------------//

module.exports = new ClientCommand({
    name: 'loop',
    description: 'n/a',
    category: ClientCommand.categories.get('MUSIC_CONTROLS'),
    options: [
        {
            type: 'STRING',
            name: 'type',
            description: 'the type of looping method',
            choices: [
                {
                    name: 'off',
                    value: 'off',
                }, {
                    name: 'current track',
                    value: 'track',
                }, {
                    name: 'all tracks',
                    value: 'queue',
                }, {
                    name: 'autoplay',
                    value: 'autoplay',
                },
            ],
            required: true,
        },
    ],
    permissions: [
        Discord.Permissions.FLAGS.VIEW_CHANNEL,
        Discord.Permissions.FLAGS.SEND_MESSAGES,
        Discord.Permissions.FLAGS.CONNECT,
        Discord.Permissions.FLAGS.SPEAK,
    ],
    context: 'GUILD_CHANNELS',
    /** @type {ClientCommandHandler} */
    async handler(discord_client, command_interaction) {
        await command_interaction.defer();

        const player = await AudioManager.fetchPlayer(discord_client, command_interaction.guild_id);

        const queue = player.getQueue(command_interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return command_interaction.followUp({
                content: `${command_interaction.user}, nothing is playing right now!`,
            });
        }

        const looping_type = command_interaction.options.get('type').value;

        switch (looping_type) {
            case 'off': {
                queue.setRepeatMode(QueueRepeatMode.OFF);
                break;
            }
            case 'track': {
                queue.setRepeatMode(QueueRepeatMode.TRACK);
                break;
            }
            case 'queue': {
                queue.setRepeatMode(QueueRepeatMode.QUEUE);
                break;
            }
            case 'autoplay': {
                queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
                break;
            }
            default: {
                break;
            }
        }

        command_interaction.followUp({
            content: `${command_interaction.user}, set queue looping to **${looping_type}**.`,
        });
    },
});
