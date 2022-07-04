//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberHavePermission } from '@root/common/app/permissions';

//------------------------------------------------------------//

async function rolesAddSubCommandHandler(
    interaction: Discord.ChatInputCommandInteraction<'cached'>,
): Promise<void> {
    const member = interaction.options.getMember('member');
    if (!member) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, the member you specified could not be found.`,
                }),
            ],
        });

        return;
    }

    const role_to_add = interaction.options.getRole('role', true);
    if (!role_to_add) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, you must specify a valid role to add.`,
                }),
            ],
        });

        return;
    }

    const is_member_allowed_to_manage_role = member.roles.highest.comparePositionTo(role_to_add) > 0;
    if (!is_member_allowed_to_manage_role) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.RED,
                    description: `${interaction.user}, you aren't allowed to manage <@&${role_to_add.id}>`,
                }),
            ],
        });

        return;
    }

    if (member.roles.cache.has(role_to_add.id)) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, ${member} already has <@&${role_to_add.id}>.`,
                }),
            ],
        });

        return;
    }

    try {
        await member.roles.add(role_to_add);
    } catch (error) {
        console.warn(error);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.RED,
                    description: `${interaction.user}, failed to add <@&${role_to_add.id}> to ${member}.`,
                }),
            ],
        });

        return;
    }

    await interaction.editReply({
        embeds: [
            CustomEmbed.from({
                color: CustomEmbed.colors.GREEN,
                description: `${interaction.user}, added <@&${role_to_add.id}> to ${member}.`,
            }),
        ],
    });
}

async function rolesRemoveSubCommandHandler(
    interaction: Discord.ChatInputCommandInteraction<'cached'>,
): Promise<void> {
    const member = interaction.options.getMember('member');
    if (!member) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, the member you specified could not be found.`,
                }),
            ],
        });

        return;
    }

    const role_to_remove = interaction.options.getRole('role', true);
    if (!role_to_remove) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, you must specify a valid role to remove.`,
                }),
            ],
        });

        return;
    }

    const is_member_allowed_to_manage_role = member.roles.highest.comparePositionTo(role_to_remove) > 0;
    if (!is_member_allowed_to_manage_role) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.RED,
                    description: `${interaction.user}, you aren't allowed to manage <@&${role_to_remove.id}>`,
                }),
            ],
        });

        return;
    }

    if (!member.roles.cache.has(role_to_remove.id)) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, ${member} already does not have <@&${role_to_remove.id}>.`,
                }),
            ],
        });

        return;
    }

    try {
        await member.roles.remove(role_to_remove);
    } catch (error) {
        console.warn(error);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.RED,
                    description: `${interaction.user}, failed to remove <@&${role_to_remove.id}> from ${member}.`,
                }),
            ],
        });

        return;
    }

    await interaction.editReply({
        embeds: [
            CustomEmbed.from({
                color: CustomEmbed.colors.GREEN,
                description: `${interaction.user}, removed <@&${role_to_remove.id}> from ${member}.`,
            }),
        ],
    });
}

async function rolesRemoveAllSubCommandHandler(
    interaction: Discord.ChatInputCommandInteraction<'cached'>,
): Promise<void> {
    const member = interaction.options.getMember('member');
    if (!member) {
        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.YELLOW,
                    description: `${interaction.user}, the member you specified could not be found.`,
                }),
            ],
        });

        return;
    }

    const roles_to_remove = new Discord.Collection<string, Discord.Role>();
    for (const role of member.roles.cache.values()) {
        const is_member_allowed_to_manage_role = member.roles.highest.comparePositionTo(role) > 0;
        if (!is_member_allowed_to_manage_role) continue;

        roles_to_remove.set(role.id, role);
    }

    try {
        await member.roles.remove(roles_to_remove);
    } catch (error) {
        console.warn(error);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.RED,
                    description: `${interaction.user}, failed to remove roles from ${member}.`,
                }),
            ],
        });

        return;
    }

    await interaction.editReply({
        embeds: [
            CustomEmbed.from({
                color: CustomEmbed.colors.GREEN,
                description: `${interaction.user}, removed ${roles_to_remove.size} roles from ${member}.`,
            }),
        ],
    });
}

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'roles',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'manages roles for a guild member',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'add',
                description: 'adds a role to a member',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.User,
                        name: 'member',
                        description: 'the guild member',
                        required: true,
                    }, {
                        type: Discord.ApplicationCommandOptionType.Role,
                        name: 'role',
                        description: 'the role to add',
                        required: true,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'remove',
                description: 'removes a role from a member',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.User,
                        name: 'member',
                        description: 'the guild member',
                        required: true,
                    }, {
                        type: Discord.ApplicationCommandOptionType.Role,
                        name: 'role',
                        description: 'the role to remove',
                        required: true,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'remove-all',
                description: 'removes all roles from a member',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.User,
                        name: 'member',
                        description: 'the guild member',
                        required: true,
                    },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.GUILD_ADMIN,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.ManageRoles,
        ],
        command_category: ClientCommandHelper.categories.GUILD_ADMIN,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const is_member_allowed_to_manage_roles = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.ManageRoles);
        if (!is_member_allowed_to_manage_roles) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, you do not have permission to manage roles.`,
                    }),
                ],
            });

            return;
        }

        const sub_command_name = interaction.options.getSubcommand(true);
        switch (sub_command_name) {
            case 'add': {
                await rolesAddSubCommandHandler(interaction);

                break;
            }

            case 'remove': {
                await rolesRemoveSubCommandHandler(interaction);

                break;
            }

            case 'remove-all': {
                await rolesRemoveAllSubCommandHandler(interaction);

                break;
            }

            default: {
                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.colors.RED,
                            description: `${interaction.user}, the subcommand you specified is not valid.`,
                        }),
                    ],
                });

                break;
            }
        }
    },
});
