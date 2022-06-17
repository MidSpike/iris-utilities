//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { music_subscriptions } from '@root/common/app/music/music';

//------------------------------------------------------------//

type QueuePageName = 'previous_tracks' | 'current_track' | 'future_tracks';

async function editInteractionReplyForQueueItems(
    interaction: Discord.MessageComponentInteraction | Discord.CommandInteraction,
    display_mode: QueuePageName = 'current_track',
) {
    if (!interaction.inCachedGuild()) throw new Error('interaction is not in a cached guild');

    const music_subscription = music_subscriptions.get(interaction.guildId);

    if (!music_subscription) {
        return await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, nothing is playing right now!`,
                }),
            ],
        });
    }

    const payload: Discord.WebhookEditMessageOptions = {
        embeds: [
            display_mode === 'previous_tracks' ? (
                CustomEmbed.from({
                    description: [
                        ...(music_subscription.queue.previous_tracks.length > 0 ? [
                            '**Displaying (up to 25) Previous Tracks:**',
                            ...music_subscription.queue.previous_tracks.slice(0, 25).map((track, index) => `\`[ ${-1 * (index + 1)} ]\` - ${track.metadata.title}`).reverse(),
                        ] : [
                            '**No previous tracks!**',
                        ]),
                    ].join('\n'),
                })
            ) : display_mode === 'current_track' ? (
                CustomEmbed.from({
                    description: [
                        ...(music_subscription.queue.current_track ? [
                            '**Current Playing:**',
                            `${music_subscription.queue.current_track.metadata.title}`,
                        ] : [
                            '**Nothing is playing right now!**',
                        ]),
                    ].join('\n'),
                })
            ) : (
                CustomEmbed.from({
                    description: [
                        ...(music_subscription.queue.future_tracks.length > 0 ? [
                            '**Displaying (up to 25) Upcoming Tracks:**',
                            ...music_subscription.queue.future_tracks.slice(0, 25).map((track, index) => `\`[ ${index + 1} ]\` - ${track.metadata.title}`),
                        ] : [
                            '**No upcoming tracks!**',
                        ]),
                    ].join('\n'),
                })
            ),
        ],
        components: [
            {
                type: Discord.ComponentType.ActionRow,
                components: [
                    {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: 'queue_items_display_mode_previous_tracks',
                        label: 'Previous Tracks',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: 'queue_items_display_mode_current_track',
                        label: 'Current Track',
                    }, {
                        type: Discord.ComponentType.Button,
                        style: Discord.ButtonStyle.Secondary,
                        customId: 'queue_items_display_mode_future_tracks',
                        label: 'Upcoming Tracks',
                    },
                ],
            },
        ],
    };

    return await interaction.editReply(payload);
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'queue',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'n/a',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'items',
                description: 'lists the items in the queue',
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'shuffle',
                description: 'shuffles the queue',
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'remove',
                description: 'removes an item from the queue',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.Integer,
                        name: 'position',
                        description: 'the position of the item to remove',
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'clear',
                description: 'clears the queue',
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.get('MUSIC_CONTROLS'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const member = await interaction.guild.members.fetch(interaction.user.id);

        const guild_member_voice_channel_id = member.voice.channelId;

        const bot_member = await interaction.guild.members.fetch(discord_client.user.id);

        const bot_voice_channel_id = bot_member.voice.channelId;

        if (!bot_voice_channel_id) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
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
                    CustomEmbed.from({
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
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Nothing is playing right now!',
                    }),
                ],
            }).catch(() => {});

            return;
        }

        const sub_command_name = interaction.options.getSubcommand(true);
        switch (sub_command_name) {
            case 'items': {
                const message = await editInteractionReplyForQueueItems(interaction);

                const message_component_collector = interaction.channel!.createMessageComponentCollector({
                    componentType: Discord.ComponentType.Button,
                    filter: (message_component_interaction) => message_component_interaction.message.id === message.id,
                });

                message_component_collector.on('collect', async (message_component_interaction: Discord.MessageComponentInteraction) => {
                    await message_component_interaction.deferUpdate();

                    message_component_collector.resetTimer();

                    switch (message_component_interaction.customId) {
                        case 'queue_items_display_mode_previous_tracks': {
                            await editInteractionReplyForQueueItems(message_component_interaction, 'previous_tracks');

                            break;
                        }

                        case 'queue_items_display_mode_current_track': {
                            await editInteractionReplyForQueueItems(message_component_interaction, 'current_track');

                            break;
                        }

                        case 'queue_items_display_mode_future_tracks': {
                            await editInteractionReplyForQueueItems(message_component_interaction, 'future_tracks');

                            break;
                        }

                        default: {
                            throw new Error(`Unknown customId: ${message_component_interaction.customId};`);
                        }
                    }
                });

                break;
            }

            case 'shuffle': {
                music_subscription.queue.shuffleTracks();

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, shuffled the queue!`,
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            case 'remove': {
                const position = interaction.options.getInteger('position', true) - 1; // -1 because the queue is 0-indexed

                if (position < 0 || position > music_subscription.queue.future_tracks.length) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
                                description: `${interaction.user}, the position must be between 1 and ${music_subscription.queue.future_tracks.length}!`,
                            }),
                        ],
                    }).catch(() => {});

                    return;
                }

                const removed_track = music_subscription.queue.removeTrack(position);
                if (!removed_track) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
                                description: `${interaction.user}, failed to remove track at position ${position + 1}!`,
                            }),
                        ],
                    }).catch(() => {});

                    return;
                }

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, removed ${removed_track.metadata.title} from the queue!`,
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            case 'clear': {
                music_subscription.queue.clearAllTracks();

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, cleared the queue!`,
                        }),
                    ],
                }).catch(() => {});

                break;
            }

            default: {
                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
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
