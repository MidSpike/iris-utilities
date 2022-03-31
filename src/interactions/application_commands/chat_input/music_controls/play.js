'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { delay } = require('../../../../common/lib/utilities');
const { CustomEmbed } = require('../../../../common/app/message');
const { AudioManager, VolumeManager } = require('../../../../common/app/audio');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'play',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'allows for playing audio resources',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'the query to search',
                required: true,
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.BOOLEAN,
                name: 'playnext',
                description: 'whether to play next',
                required: false,
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

        await interaction.deferReply({ ephemeral: false });

        const guild_member_voice_channel_id = interaction.member.voice.channelId;
        const bot_voice_channel_id = interaction.guild.me.voice.channelId;

        if (!guild_member_voice_channel_id) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, you need to be in a voice channel.`,
                    }),
                ],
            });
        }

        if (bot_voice_channel_id && (guild_member_voice_channel_id !== bot_voice_channel_id)) {
            return interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, you must be in the same voice channel as me.`,
                    }),
                ],
            });
        }

        const query = interaction.options.getString('query', true);
        const playnext = interaction.options.getBoolean('playnext', false) ?? false;

        await interaction.followUp({
            embeds: [
                new CustomEmbed({
                    description: `${interaction.user}, searching for:\`\`\`\n${query}\n\`\`\``,
                }),
            ],
        });

        const queue = await AudioManager.createQueue(discord_client, interaction.guildId, {
            user: interaction.user,
            channel: interaction.channel,
        });

        if (!queue.connection || !interaction.guild.me.voice.channelId) {
            try {
                await queue.connect(interaction.member.voice.channelId);
            } catch (error) {
                console.trace(`Failed to connect to the voice channel: ${error.message}`, error);
                return interaction.followUp({
                    embeds: [
                        new CustomEmbed({
                            description: `${interaction.user}, I was unable to join your voice channel!`,
                        }),
                    ],
                });
            }
        }

        const search_result = await queue.player.search(query, {
            requestedBy: interaction.user,
        });

        const tracks = search_result.playlist?.tracks ?? [ search_result.tracks[0] ];

        if (tracks.length === 0) {
            return await interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, I couldn't find anything for **${query}**.`,
                    }),
                ],
            });
        }

        if (tracks.length > 1) {
            await interaction.followUp({
                embeds: [
                    new CustomEmbed({
                        description: `${interaction.user}, added ${tracks.length} track(s) to the queue...`,
                    }),
                ],
            });
        }

        // asynchronously add tracks to the queue to allow the first item to play
        (async () => {
            for (let i = 0; i < tracks.length; i++) {
                const insert_index = playnext ? i : queue.tracks.length;
                queue.insert(tracks[i], insert_index);
                await delay(5_000);
            }
        })();

        // wait for the queue to be populated
        while (queue.tracks.length === 0) await delay(10);

        if (!queue.playing) {
            await queue.play();
            queue.setVolume(queue.volume ?? VolumeManager.scaleVolume(50)); // this will force a sensible volume
        }
    },
});
