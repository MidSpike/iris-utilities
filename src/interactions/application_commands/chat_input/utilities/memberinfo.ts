'use strict';

//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { array_chunks } from '../../../../common/lib/utilities';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientCommandHelper, ClientInteraction } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'memberinfo',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'displays information about a guild member',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.USER,
                name: 'member',
                description: 'the guild member to lookup',
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
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply({ ephemeral: false });

        const bot_message = await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    description: 'Loading...',
                }),
            ],
        });

        await interaction.guild.members.fetch(); // cache all members

        const member_id = interaction.options.getUser('member') ?? interaction.member.id;
        const member = await interaction.guild.members.fetch(member_id);

        await member.user.fetch(true); // force fetch the user

        const everyone_permissions = interaction.guild.roles.everyone.permissions.toArray();
        const member_permissions = member.permissions.toArray().filter(permission_flag => !everyone_permissions.includes(permission_flag));

        const member_user_flags = member.user.flags?.toArray() ?? [];

        const member_roles = member.roles.cache.sort((a, b) => a.position - b.position).map(role => `${role}`);

        type MemberInfoSectionName = 'default' | 'flags' | 'media' | 'permissions' | 'roles';

        async function updateBotMessage(mode: MemberInfoSectionName) {
            switch (mode) {
                case 'flags': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Flags',
                                        value: `${member_user_flags.length > 0 ? member_user_flags.map(user_flag => `- \`${user_flag}\``).join('\n') : '\`n/a\`'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'media': {
                    const guild_member_icon_url = member.avatarURL({ format: 'png', size: 4096, dynamic: true });
                    const global_user_icon_url = member.user.displayAvatarURL({ format: 'png', size: 4096, dynamic: true });
                    const global_user_banner_url = member.user.bannerURL({ format: 'png', size: 4096, dynamic: true });

                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Member Avatar',
                                        value: `${guild_member_icon_url ? `[Image](${guild_member_icon_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    }, {
                                        name: 'Global Avatar',
                                        value: `${global_user_icon_url ? `[Image](${global_user_icon_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    }, {
                                        name: 'Global Banner',
                                        value: `${global_user_banner_url ? `[Image](${global_user_banner_url})` : '\`n/a\`'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'permissions': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    {
                                        name: 'Enhanced Permissions',
                                        value: `${'```'}\n${member_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : member_permissions.join('\n') || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Inherited Permissions',
                                        value: `${'```'}\n${everyone_permissions.includes('ADMINISTRATOR') ? 'ADMINISTRATOR' : everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                                        inline: false,
                                    },
                                ],
                            }),
                        ],
                    });

                    break;
                }

                case 'roles': {
                    await bot_message.edit({
                        embeds: [
                            CustomEmbed.from({
                                title: 'Don\'t go wild with this guild member information!',
                                fields: [
                                    {
                                        name: 'Username',
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
                                        inline: false,
                                    }, {
                                        name: 'Snowflake',
                                        value: `${'```'}\n${member.id}\n${'```'}`,
                                        inline: false,
                                    },

                                    ...array_chunks(member_roles, 32).map((member_roles_chunk, chunk_index, member_roles_chunks) => ({
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
                                        value: `${'```'}\n${member.user.tag}\n${'```'}`,
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
                                        name: 'Account Creation Date',
                                        value: `<t:${member_created_timestamp_epoch}:F> (<t:${member_created_timestamp_epoch}:R>)`,
                                        inline: false,
                                    }, {
                                        name: 'Joined Guild Date',
                                        value: `<t:${member_joined_timestamp_epoch}:F> (<t:${member_joined_timestamp_epoch}:R>)`,
                                        inline: false,
                                    },

                                    ...(member.premiumSinceTimestamp ? [
                                        {
                                            name: 'Boosting Since Date',
                                            value: `<t:${member_premium_since_timestamp_epoch}:F> (<t:${member_premium_since_timestamp_epoch}:R>)`,
                                            inline: false,
                                        },
                                    ] : []),

                                    {
                                        name: 'Bot',
                                        value: `\`${member.user.bot}\``,
                                        inline: true,
                                    }, {
                                        name: 'System',
                                        value: `\`${member.user.system}\``,
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
                                    },
                                ],
                            }),
                        ],
                    }).catch(console.warn);

                    break;
                }
            }
        }

        await updateBotMessage('default');

        await bot_message.edit({
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 2,
                            custom_id: 'default',
                            label: 'Information',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'flags',
                            label: 'Flags',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'media',
                            label: 'Media',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'permissions',
                            label: 'Permissions',
                        }, {
                            type: 2,
                            style: 2,
                            custom_id: 'roles',
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
            message_button_collector.resetTimer();
            await button_interaction.deferUpdate();

            if (message_button_collector.ended) return;

            await updateBotMessage(button_interaction.customId as MemberInfoSectionName);
        });

        message_button_collector.on('end', async () => {
            await bot_message.delete().catch(console.warn);
        });
    },
});
