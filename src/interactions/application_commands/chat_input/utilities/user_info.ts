//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { arrayChunks } from '@root/common/lib/utilities';

import { CustomEmbed, disableMessageComponents } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'user_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays information about a guild member',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.User,
                name: 'member',
                description: 'the guild member to lookup',
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

        await interaction.deferReply({ ephemeral: false });

        const bot_message = await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        const member_resolvable = interaction.options.getUser('member', false) ?? interaction.member;
        const member = await interaction.guild.members.fetch({ user: member_resolvable });

        await member.user.fetch(true); // force fetch the user

        const everyone_permissions = interaction.guild.roles.everyone.permissions.toArray();
        const member_permissions = member.permissions.toArray().filter((permission_flag) => !everyone_permissions.includes(permission_flag));

        const member_user_flags = member.user.flags?.toArray() ?? [];

        const member_roles = member.roles.cache.sort((a, b) => a.position - b.position).map((role) => `${role}`);

        type MemberInfoSectionName = (
            | 'memberinfo_btn_default'
            | 'memberinfo_btn_flags'
            | 'memberinfo_btn_media'
            | 'memberinfo_btn_permissions'
            | 'memberinfo_btn_roles'
        );

        async function updateBotMessage(mode: MemberInfoSectionName) {
            switch (mode) {
                case 'memberinfo_btn_flags': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.username}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Flags',
                                        value: `${member_user_flags.length > 0 ? member_user_flags.map((user_flag) => `- \`${user_flag}\``).join('\n') : '\`n/a\`'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'memberinfo_btn_media': {
                    const guild_member_icon_url = member.avatarURL({ forceStatic: false, size: 4096 });
                    const global_user_icon_url = member.user.displayAvatarURL({ forceStatic: false, size: 4096 });
                    const global_user_banner_url = member.user.bannerURL({ forceStatic: false, size: 4096 });

                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.username}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Member Avatar',
                                        value: `${guild_member_icon_url ? `[Image](${guild_member_icon_url})` : '\`n/a\`'}`,
                                        inline: true,
                                    }, {
                                        name: 'User Avatar',
                                        value: `${global_user_icon_url ? `[Image](${global_user_icon_url})` : '\`n/a\`'}`,
                                        inline: true,
                                    }, {
                                        name: 'User Banner',
                                        value: `${global_user_banner_url ? `[Image](${global_user_banner_url})` : '\`n/a\`'}`,
                                        inline: true,
                                    },
                                ],
                                image: {
                                    url: global_user_icon_url,
                                },
                            }),
                        ],
                    });

                    break;
                }

                case 'memberinfo_btn_permissions': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.username}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Enhanced Permissions',
                                        value: `${'```'}\n${member_permissions.includes('Administrator') ? 'Administrator' : member_permissions.join('\n') || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Inherited Permissions',
                                        value: `${'```'}\n${everyone_permissions.includes('Administrator') ? 'Administrator' : everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'memberinfo_btn_roles': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.username}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...arrayChunks(member_roles, 32).map((member_roles_chunk, chunk_index, member_roles_chunks) => ({
                                        name: `Roles ${chunk_index+1}/${member_roles_chunks.length}`,
                                        value: `${member_roles_chunk.join(' - ')}`,
                                        inline: false,
                                    })),
                                ],
                            }),
                        ],
                    });

                    break;
                }

                default: {
                    const member_created_timestamp_epoch = `${member.user.createdTimestamp}`.slice(0, -3);
                    const member_joined_timestamp_epoch = `${member.joinedTimestamp}`.slice(0, -3);
                    const member_premium_since_timestamp_epoch = `${member.premiumSinceTimestamp}`.slice(0, -3);

                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.username}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...(member.nickname ? [
                                        {
                                            name: 'Nickname',
                                            value: `${'```'}\n${member.nickname}\n${'```'}`,
                                            inline: false,
                                        },
                                    ] : []),

                                    {
                                        name: 'Account Created On',
                                        value: `<t:${member_created_timestamp_epoch}:F> (<t:${member_created_timestamp_epoch}:R>)`,
                                        inline: false,
                                    }, {
                                        name: 'Joined Guild On',
                                        value: `<t:${member_joined_timestamp_epoch}:F> (<t:${member_joined_timestamp_epoch}:R>)`,
                                        inline: false,
                                    },

                                    ...(member.premiumSinceTimestamp ? [
                                        {
                                            name: 'Boosting Since',
                                            value: `<t:${member_premium_since_timestamp_epoch}:F> (<t:${member_premium_since_timestamp_epoch}:R>)`,
                                            inline: false,
                                        },
                                    ] : []),

                                    {
                                        name: 'System',
                                        value: `\`${member.user.system}\``,
                                        inline: true,
                                    }, {
                                        name: 'Bot',
                                        value: `\`${member.user.bot}\``,
                                        inline: true,
                                    }, {
                                        name: 'Manageable',
                                        value: `\`${member.manageable}\``,
                                        inline: true,
                                    }, {
                                        name: 'Kickable',
                                        value: `\`${member.kickable}\``,
                                        inline: true,
                                    }, {
                                        name: 'Bannable',
                                        value: `\`${member.bannable}\``,
                                        inline: true,
                                    }, {
                                        name: 'Display Color',
                                        value: `\`${member.displayHexColor}\``,
                                        inline: true,
                                    }, {
                                        name: 'Accent Color',
                                        value: `${member.user.accentColor ?? '\`automatic\`'}`,
                                        inline: true,
                                    },
                                ],
                            }),
                        ],
                    }).catch(console.warn);

                    break;
                }
            }
        }

        await updateBotMessage('memberinfo_btn_default');

        await bot_message.edit({
            components: [
                {
                    type: Discord.ComponentType.ActionRow,
                    components: [
                        {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'memberinfo_btn_default',
                            label: 'Information',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'memberinfo_btn_flags',
                            label: 'Flags',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'memberinfo_btn_media',
                            label: 'Media',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'memberinfo_btn_permissions',
                            label: 'Permissions',
                        }, {
                            type: Discord.ComponentType.Button,
                            style: Discord.ButtonStyle.Secondary,
                            customId: 'memberinfo_btn_roles',
                            label: 'Roles',
                        },
                    ],
                },
            ],
        });

        const message_button_collector = bot_message.createMessageComponentCollector({
            filter: (button_interaction) => button_interaction.user.id === interaction.user.id,
            time: 5 * 60_000, // 5 minutes
        });

        message_button_collector.on('collect', async (button_interaction) => {
            await button_interaction.deferUpdate();
            message_button_collector.resetTimer();

            await updateBotMessage(button_interaction.customId as MemberInfoSectionName);
        });

        message_button_collector.on('end', async () => {
            disableMessageComponents(bot_message);
        });
    },
});
