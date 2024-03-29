//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed, CustomEmoji, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { music_subscriptions } from '@root/common/app/music/music';

//------------------------------------------------------------//

function clampVolume(volume: number, min_volume=0, max_volume=200) {
    return Math.max(min_volume, Math.min(max_volume, volume));
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'volume',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'allows you to view and/or control the volume',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'level',
                description: 'the volume level',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.MUSIC_CONTROLS,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const music_subscription = music_subscriptions.get(interaction.guildId);
        if (!music_subscription) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, nothing is playing right now!`,
                    }),
                ],
            }).catch(() => {});
            return;
        }

        const raw_volume_input = interaction.options.getInteger('level');
        const volume_input = typeof raw_volume_input === 'number' ? clampVolume(raw_volume_input) : null;
        if (typeof volume_input === 'number') {
            music_subscription.queue.volume_manager.volume = volume_input;
        }

        const bot_message = await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    ...(volume_input ? {
                        description: `${interaction.user}, set the volume to **${volume_input}**!`,
                    } : {
                        description: `${interaction.user}, the current volume is **${music_subscription.queue.volume_manager.volume}**!`,
                    }),
                }),
            ],
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'volume_mute',
                            emoji: CustomEmoji.convertToObject(CustomEmoji.Identifiers.Mute),
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'volume_down',
                            emoji: CustomEmoji.convertToObject(CustomEmoji.Identifiers.VolumeDown),
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'volume_up',
                            emoji: CustomEmoji.convertToObject(CustomEmoji.Identifiers.VolumeUp),
                        },
                    ],
                },
            ],
        });

        const button_interaction_collector = bot_message.createMessageComponentCollector({
            time: 1 * 60_000, // 1 minute
        });

        button_interaction_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();

            button_interaction_collector.resetTimer();

            switch (button_interaction.customId) {
                case 'volume_mute': {
                    music_subscription.queue.volume_manager.toggleMute();

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                ...(music_subscription.queue.volume_manager.muted ? {
                                    description: `${button_interaction.user}, muted the volume!`,
                                } : {
                                    description: `${button_interaction.user}, unmuted the volume!`,
                                }),
                            }),
                        ],
                    });

                    break;
                }

                case 'volume_down': {
                    music_subscription.queue.volume_manager.volume = clampVolume(music_subscription.queue.volume_manager.volume - 10);

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${button_interaction.user}, decreased the volume to **${music_subscription.queue.volume_manager.volume}**!`,
                            }),
                        ],
                    });

                    break;
                }

                case 'volume_up': {
                    music_subscription.queue.volume_manager.volume = clampVolume(music_subscription.queue.volume_manager.volume + 10);

                    await button_interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                description: `${button_interaction.user}, increased the volume to **${music_subscription.queue.volume_manager.volume}**!`,
                            }),
                        ],
                    });

                    break;
                }

                default: {
                    break;
                }
            }
        });

        button_interaction_collector.on('end', async () => {
            await disableMessageComponents(bot_message);
        });
    },
});
