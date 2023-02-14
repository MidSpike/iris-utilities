//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GuildConfigLoggingChannels, Setting } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

//------------------------------------------------------------//

export default {
    name: 'logging_channels',
    description: 'manage channels that are used for logging',
    actions: [
        {
            name: 'help',
            description: 'displays information about the logging channels feature',
            options: [],
            async handler(setting, guild_config, command_interaction) {
                if (!command_interaction.isChatInputCommand()) return;
                if (!command_interaction.inCachedGuild()) return;
                if (!command_interaction.channel) return;

                const available_logging_types = Object.values(GuildConfigLoggingChannels);

                command_interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                `${command_interaction.user}, logging channels is a feature that allows you to assign channels to be used for logging various events that occur.`,
                                '',
                                'Currently, the following event types are supported:',
                                available_logging_types.map((logging_type) => `- \`${logging_type}\``).join('\n'),
                                '',
                                'By default, none of the logging channels are set.',
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'list',
            description: 'lists all enabled logging channels',
            options: [],
            async handler(setting, guild_config, command_interaction) {
                if (!command_interaction.isChatInputCommand()) return;
                if (!command_interaction.inCachedGuild()) return;
                if (!command_interaction.channel) return;

                const enabled_logging_channels: [string, string | undefined][] = Object.entries(guild_config.logging_channels ?? {});

                command_interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                ...(enabled_logging_channels.length > 0 ? [
                                    `${command_interaction.user}, here are the enabled logging channels:`,
                                    enabled_logging_channels.map(
                                        ([ logging_location, logging_channel_id ]) => `- ${logging_location}: ${logging_channel_id ? `<#${logging_channel_id}>` : '<#deleted-channel>'}`,
                                    ).join('\n'),
                                ] : [
                                    `${command_interaction.user}, no logging channels are enabled.`,
                                ]),
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'set',
            description: 'sets a specified channel for logging',
            options: [
                {
                    type: Discord.ApplicationCommandOptionType.String,
                    name: 'event',
                    description: 'the event to log to the specified channel',
                    choices: Object.values(GuildConfigLoggingChannels).map((value) => ({
                        name: value,
                        value: value,
                    })),
                    required: true,
                }, {
                    type: Discord.ApplicationCommandOptionType.Channel,
                    name: 'channel',
                    description: 'the channel to set for logging',
                    required: true,
                },
            ],
            async handler(setting, guild_config, interaction) {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.inCachedGuild()) return;
                if (!interaction.channel) return;

                const db_logging_event = interaction.options.getString('event', true) as GuildConfigLoggingChannels;
                const channel = interaction.options.getChannel('channel', true);

                if (!channel.isTextBased()) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Yellow,
                                description: `${interaction.user}, ${channel} is not a text channel.`,
                            }),
                        ],
                    }).catch(console.warn);

                    return;
                }

                await GuildConfigsManager.setKey(interaction.guildId, `logging_channels.${db_logging_event}`, channel.id);

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, ${channel} has been set as the ${db_logging_event} logging channel.`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'unset',
            description: 'unset an event from logging',
            options: [
                {
                    type: Discord.ApplicationCommandOptionType.String,
                    name: 'event',
                    description: 'the event to unset from logging',
                    choices: Object.values(GuildConfigLoggingChannels).map((value) => ({
                        name: value,
                        value: value,
                    })),
                    required: true,
                },
            ],
            async handler(setting, guild_config, interaction) {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.inCachedGuild()) return;
                if (!interaction.channel) return;

                const db_logging_event = interaction.options.getString('event', true) as GuildConfigLoggingChannels;

                await GuildConfigsManager.unsetKey(interaction.guildId, `logging_channels.${db_logging_event}`);

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, the ${db_logging_event} logging channel has been unset.`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'reset',
            description: 'resets the logging feature',
            options: [],
            async handler(setting, guild_config, interaction) {
                await GuildConfigsManager.setKey(interaction.guildId, 'logging_channels', {});

                interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, reset the logging channels feature.`,
                        }),
                    ],
                }).catch(console.warn);
            },
        },
    ],
} as Setting;
