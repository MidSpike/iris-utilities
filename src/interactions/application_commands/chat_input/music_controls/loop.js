'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { QueueRepeatMode } = require('discord-player');

const { CustomEmbed } = require('../../../../common/app/message');
const { AudioManager } = require('../../../../common/app/audio');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'loop',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
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
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
            Discord.Permissions.FLAGS.CONNECT,
            Discord.Permissions.FLAGS.SPEAK,
        ],
        command_category: ClientCommandHelper.categories.get('MUSIC_CONTROLS'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        const queue = await AudioManager.createQueue(discord_client, interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, nothing is playing right now!`,
                    }),
                ],
            });
        }

        /** @type {Discord.GuildMember} */
        const guild_member = interaction.member;

        const guild_member_voice_channel = guild_member.voice.channel;
        const bot_voice_channel = interaction.guild.me.voice.channel;

        if (guild_member_voice_channel.id !== bot_voice_channel.id) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, you must be in the same voice channel as me.`,
                    }),
                ],
            });
        }

        const looping_type = interaction.options.getString('type');

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

        interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, set queue looping to **${looping_type}**.`,
                }),
            ],
        });
    },
});
