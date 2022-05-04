'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { CustomEmbed } = require('../../../../common/app/message');
const { ClientInteraction, ClientCommandHelper } = require('../../../../common/app/client_interactions');

const { music_subscriptions } = require('../../../../common/app/music/music');

//------------------------------------------------------------//

module.exports = new ClientInteraction({
    identifier: 'queue',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                name: 'items',
                description: 'lists the items in the queue',
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                name: 'shuffle',
                description: 'shuffles the queue',
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                name: 'remove',
                description: 'removes an item from the queue',
                options: [
                    {
                        type: Discord.Constants.ApplicationCommandOptionTypes.INTEGER,
                        name: 'position',
                        description: 'the position of the item to remove',
                    },
                ],
            }, {
                type: Discord.Constants.ApplicationCommandOptionTypes.SUB_COMMAND,
                name: 'clear',
                description: 'clears the queue',
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

        const guild_member_voice_channel_id = interaction.member?.voice?.channel?.id;
        const bot_voice_channel_id = interaction.guild.me.voice.channel?.id;

        if (!bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, I\'m not connected to a voice channel!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        if (guild_member_voice_channel_id !== bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you need to be in the same voice channel as me!`,
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const music_subscription = music_subscriptions.get(interaction.guildId);
        if (!music_subscription) {
            await interaction.editReply({
                embeds: [
                    new CustomEmbed({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Nothing is playing right now!',
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const queue = music_subscription.queue;

        const sub_command_name = interaction.options.getSubcommand(true);
        switch (sub_command_name) {
            case 'items': {
                if (!queue.current_track) {
                    await interaction.editReply({
                        embeds: [
                            new CustomEmbed({
                                color: CustomEmbed.colors.YELLOW,
                                title: 'Nothing is playing right now!',
                            }),
                        ],
                    }).catch(() => {});

                    return;
                }

                await interaction.editReply({
                    embeds: [
                        new CustomEmbed({
                            description: [
                                ...(queue.previous_tracks.length > 0 ? [
                                    '**Previous Tracks (up to 5):**',
                                    ...queue.previous_tracks.slice(0, 5).reverse().map((track, index) => `- [${track.title}](${track.url})`),
                                    '',
                                ] : []),
                                `**Current Playing:**`,
                                `- [${queue.current_track.title}](${queue.current_track.url})`,
                                ...(queue.future_tracks.length > 0 ? [
                                    '',
                                    `**Next Tracks (up to 10):**`,
                                    ...queue.future_tracks.slice(0, 10).map((track, index) => `- [${track.title}](${track.url})`),
                                ] : []),
                            ].join('\n'),
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            case 'shuffle': {
                queue.shuffleTracks();

                await interaction.editReply({
                    embeds: [
                        new CustomEmbed({
                            description: `${interaction.user}, shuffled the queue!`,
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            case 'remove': {
                const position = interaction.options.getInteger('position', true) - 1; // -1 because the queue is 0-indexed

                if (position < 0 || position > queue.future_tracks.length) {
                    await interaction.editReply({
                        embeds: [
                            new CustomEmbed({
                                color: CustomEmbed.colors.YELLOW,
                                description: `${interaction.user}, the position must be between 1 and ${queue.future_tracks.length}!`,
                            }),
                        ],
                    }).catch(() => {});

                    return;
                }

                const removed_track = queue.removeTrack(position);
                if (!removed_track) {
                    await interaction.editReply({
                        embeds: [
                            new CustomEmbed({
                                color: CustomEmbed.colors.YELLOW,
                                description: `${interaction.user}, failed to remove track at position ${position + 1}!`,
                            }),
                        ],
                    }).catch(() => {});

                    return;
                }

                await interaction.editReply({
                    embeds: [
                        new CustomEmbed({
                            description: `${interaction.user}, removed ${removed_track.title} from the queue!`,
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            case 'clear': {
                queue.clearAllTracks();

                await interaction.editReply({
                    embeds: [
                        new CustomEmbed({
                            description: `${interaction.user}, cleared the queue!`,
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            default: {
                await interaction.editReply({
                    embeds: [
                        new CustomEmbed({
                            color: CustomEmbed.colors.RED,
                            title: 'Invalid sub-command!',
                        }),
                    ],
                }).catch(() => {});

                return;
            }
        }
    },
});
