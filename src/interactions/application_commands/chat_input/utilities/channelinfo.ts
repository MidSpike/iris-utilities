//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'channelinfo',
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
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

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
                        color: CustomEmbed.colors.RED,
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
                            value: `\`${channel.type}\``,
                            inline: true,
                        }, {
                            name: 'Position',
                            value: `\`${channel.position}\``,
                            inline: true,
                        },

                        ...(channel.parent ? [
                            {
                                name: 'Synced Permissions',
                                value: `\`${channel.permissionsLocked}\``,
                                inline: true,
                            }, {
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
                        }, {
                            name: 'Deletable',
                            value: `\`${channel.deletable ?? 'n/a'}\``,
                            inline: true,
                        }, {
                            name: 'Manageable',
                            value: `\`${channel.manageable ?? 'n/a'}\``,
                            inline: true,
                        },

                        // eslint-disable-next-line no-negated-condition
                        ...(!channel.isVoiceBased() ? [
                            {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            },
                        ] : []),

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
                                value: `\`${(channel as Discord.BaseGuildVoiceChannel & { speakable?: boolean }).speakable ?? 'n/a'}\``,
                                inline: true,
                            }, {
                                name: '\u200b',
                                value: '\u200b',
                                inline: true,
                            }, {
                                name: 'Members',
                                value: `${channel.members.size > 15 ? '\`More than 15 people!\`' : channel.members.map(member => `${member}`).join(' - ')}`,
                                inline: false,
                            },
                        ] : []),
                    ],
                }),
            ],
        });
    },
});
