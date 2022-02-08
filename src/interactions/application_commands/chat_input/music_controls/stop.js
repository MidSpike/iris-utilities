'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { AudioManager } = require('../../../../common/app/audio');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'stop',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'allows for playing audio resources',
        options: [],
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

        await interaction.deferReply({ ephemeral: false });

        const queue = await AudioManager.createQueue(discord_client, interaction.guildId);

        if (!queue?.connection || !queue?.playing) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `${interaction.user}, nothing is playing right now!`,
                    }),
                ],
            });
        }

        const guild_member_voice_channel_id = interaction.member?.voice?.channel?.id;
        const bot_voice_channel_id = interaction.guild.me.voice.channel?.id;

        if (!bot_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `${interaction.user}, I\'m not connected to a voice channel!`,
                    }),
                ],
            });
        }

        if (guild_member_voice_channel_id !== bot_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        color: 0xFFFF00,
                        description: `${interaction.user}, you need to be in the same voice channel as me!`,
                    }),
                ],
            });
        }

        queue.stop();

        interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, stopped the music!`,
                }),
            ],
        });
    },
});