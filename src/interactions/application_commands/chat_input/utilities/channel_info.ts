//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'channel_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays information about a guild channel',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Channel,
                name: 'channel',
                description: 'the guild channel to lookup',
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
        ],
        command_category: ClientCommandHelper.categories.UTILITIES,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply();

        const bot_message = await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        await interaction.guild.members.fetch(); // cache all members

        const channel_resolvable = interaction.options.getChannel('channel', false)?.id ?? interaction.channelId;
        const channel = await interaction.guild.channels.fetch(channel_resolvable);
        if (!channel) {
            await bot_message.edit({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `Unable to find channel \`${channel_resolvable}\`.`,
                    }),
                ],
            });

            return;
        }

        const everyone_permissions = channel.permissionsFor(interaction.guild.roles.everyone.id, true)?.toArray() ?? [];

        const channel_created_timestamp_epoch = `${channel.createdTimestamp}`.slice(0, -3);

        await bot_message.edit({
            embeds: [
                CustomEmbed.from({
                    title: 'Don\'t go wild with this channel information!',
                    fields: [
                        {
                            name: 'Name',
                            value: `${'```'}\n${channel.name}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `${'```'}\n${channel.id}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Creation Date',
                            value: `<t:${channel_created_timestamp_epoch}:F> (<t:${channel_created_timestamp_epoch}:R>)`,
                            inline: false,
                        },

                        {
                            name: 'Default Permissions',
                            value: `${'```'}\n${everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Type',
                            value: `\`${Discord.ChannelType[channel.type]}\``,
                            inline: true,
                        },
                        ...('position' in channel ? [
                            {
                                name: 'Position',
                                value: `\`${channel.position}\``,
                                inline: true,
                            },
                        ] : []),

                        ...(channel.parent ? [
                            ...('permissionsLocked' in channel ? [
                                {
                                    name: 'Synced Permissions',
                                    value: `\`${channel.permissionsLocked}\``,
                                    inline: true,
                                },
                            ] : []),
                            {
                                name: 'Parent Name',
                                value: `\`${channel.parent.name}\``,
                                inline: true,
                            }, {
                                name: 'Parent Snowflake',
                                value: `\`${channel.parent.id}\``,
                                inline: true,
                            },
                        ] : []),

                        {
                            name: 'Viewable',
                            value: `\`${channel.viewable ?? 'n/a'}\``,
                            inline: true,
                        },
                        ...('deletable' in channel ? [
                            {
                                name: 'Deletable',
                                value: `\`${channel.deletable}\``,
                                inline: true,
                            },
                        ] : []),
                        {
                            name: 'Manageable',
                            value: `\`${channel.manageable ?? 'n/a'}\``,
                            inline: true,
                        },

                        ...(channel.isVoiceBased() ? [
                            // show nothing
                        ] : [
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            },
                        ]),

                        ...(channel.isVoiceBased() ? [
                            {
                                name: 'Region',
                                value: `\`${channel.rtcRegion ?? 'Automatic'}\``,
                                inline: true,
                            }, {
                                name: 'Joinable',
                                value: `\`${channel.joinable}\``,
                                inline: true,
                            }, {
                                name: 'Speakable',
                                value: `\`${'speakable' in channel ? channel.speakable : 'n/a'}\``,
                                inline: true,
                            }, {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            },
                            ...(channel.members.size > 0 ? [
                                {
                                    name: 'Members',
                                    value: `${channel.members.size > 10 ? '\`More than 10 people!\`' : channel.members.map((member) => `${member}`).join(' - ')}`,
                                    inline: false,
                                },
                            ] : []),
                        ] : []),
                    ],
                }),
            ],
        });
    },
});
