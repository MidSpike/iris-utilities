//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Setting } from '@root/types/index';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

//------------------------------------------------------------//

export default {
    name: 'server_admin_roles',
    actions: [
        {
            name: 'help',
            description: 'displays information about the server admin roles feature',
            options: [],
            async handler(setting, guild_config, command_interaction) {
                command_interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                `${command_interaction.user}, server admin roles is a feature that allows you to assign roles to be recognized as server admins by me.`,
                                '',
                                'For example, by default only users with the \`Administrator\` permission can run my server admin commands.',
                                'If you want to allow another role to have access to my server admin commands, you can add that role using this command.',
                                '',
                                'By default, the server admin roles list is empty.',
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'list',
            description: 'lists all roles in the server admins list',
            options: [],
            async handler(setting, guild_config, command_interaction) {
                const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

                command_interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: [
                                ...(guild_admin_role_ids.length > 0 ? [
                                    `${command_interaction.user}, here are the current server admin roles:`,
                                    guild_admin_role_ids.map(role_id => `- <@&${role_id}>`).join('\n'),
                                ] : [
                                    `${command_interaction.user}, the server admin roles list is empty.`,
                                ]),
                            ].join('\n'),
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'add',
            description: 'adds a specified role to the admins list',
            options: [
                {
                    type: Discord.ApplicationCommandOptionType.Role,
                    name: 'role',
                    description: 'the role to add to the admins list',
                    required: true,
                },
            ],
            async handler(setting, guild_config, interaction) {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.inCachedGuild()) return;
                if (!interaction.channel) return;

                const guild_admin_role_ids: string[] = guild_config.admin_role_ids ?? [];

                const role = interaction.options.getRole('role', true);

                if (guild_admin_role_ids.includes(role.id)) {
                    return interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
                                description: `${interaction.user}, <@&${role.id}> is already in the admin roles list.`,
                            }),
                        ],
                    }).catch(console.warn);
                }

                await GuildConfigsManager.update(interaction.guildId, {
                    admin_role_ids: [
                        ...guild_admin_role_ids,
                        role.id,
                    ],
                });

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, added ${role} to server admins list.`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'remove',
            description: 'removes a specified role from the admins list',
            options: [
                {
                    type: Discord.ApplicationCommandOptionType.Role,
                    name: 'role',
                    description: 'the role to remove from the admins list',
                    required: true,
                },
            ],
            async handler(setting, guild_config, interaction) {
                if (!interaction.isChatInputCommand()) return;
                if (!interaction.inCachedGuild()) return;
                if (!interaction.channel) return;

                const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

                const role_id = interaction.options.getString('role', true);

                if (guild_admin_role_ids.includes(role_id)) {
                    return interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.colors.YELLOW,
                                description: `${interaction.user}, <@&${role_id}> is already in the admin roles list.`,
                            }),
                        ],
                    }).catch(console.warn);
                }

                await GuildConfigsManager.update(interaction.guildId, {
                    admin_role_ids: [
                        ...guild_admin_role_ids,
                        role_id,
                    ],
                });

                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, added <@&${role_id}> to server admins list`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'reset',
            description: 'resets back to default',
            options: [],
            async handler(setting, guild_config, interaction) {

                await GuildConfigsManager.update(interaction.guildId, {
                    admin_role_ids: [],
                });

                interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, reset the server admin roles list`,
                        }),
                    ],
                }).catch(console.warn);
            },
        }, {
            name: 'cleanup',
            description: 'removes any deleted roles',
            options: [],
            async handler(setting, guild_config, interaction) {
                const guild_admin_role_ids: string[] = guild_config.admin_role_ids ?? [];

                const guild = await interaction.client.guilds.fetch(interaction.guildId);
                const guild_role_ids = Array.from(guild.roles.cache.keys());

                const existing_role_ids = guild_admin_role_ids.filter(role_id => guild_role_ids.includes(role_id));

                await GuildConfigsManager.update(interaction.guildId, {
                    admin_role_ids: existing_role_ids,
                });

                interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            description: `${interaction.user}, cleaned up the server admin roles`,
                        }),
                    ],
                }).catch(console.warn);
            },
        },
    ],
} as Setting;
