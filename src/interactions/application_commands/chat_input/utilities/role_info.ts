//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'role_info',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'displays information about a role in this guild',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Role,
                name: 'role',
                description: 'the guild role to lookup',
                required: true,
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

        const role_resolvable = interaction.options.getRole('role', true).id;
        const role = await interaction.guild.roles.fetch(role_resolvable);

        if (!role) {
            await bot_message.edit({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: 'Role not found',
                    }),
                ],
            });

            return;
        }

        const everyone_permissions = interaction.guild.roles.everyone.permissions.toArray();
        const role_permissions = role.permissions.toArray().filter(
            (permission_flag) => !everyone_permissions.includes(permission_flag)
        );

        const role_created_timestamp_epoch = `${role.createdTimestamp}`.slice(0, -3);

        await bot_message.edit({
            embeds: [
                CustomEmbed.from({
                    title: 'Don\'t go wild with this role information!',
                    fields: [
                        {
                            name: 'Name',
                            value: `${'```'}\n${role.name}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Snowflake',
                            value: `${'```'}\n${role.id}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Creation Date',
                            value: `<t:${role_created_timestamp_epoch}:F> (<t:${role_created_timestamp_epoch}:R>)`,
                            inline: false,
                        }, {
                            name: 'Enhanced Permissions',
                            value: `${'```'}\n${role_permissions.includes('Administrator') ? 'Administrator' : role_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        }, {
                            name: 'Inherited Permissions',
                            value: `${'```'}\n${everyone_permissions.includes('Administrator') ? 'Administrator' : everyone_permissions.join('\n') || 'n/a'}\n${'```'}`,
                            inline: false,
                        },

                        {
                            name: 'Color',
                            value: `\`${role.color === 0x000000 ? 'n/a' : role.hexColor}\``,
                            inline: true,
                        }, {
                            name: 'Position',
                            value: `\`${role.position}\``,
                            inline: true,
                        }, {
                            name: 'Hoisted',
                            value: `\`${role.hoist}\``,
                            inline: true,
                        }, {
                            name: 'Managed',
                            value: `\`${role.managed}\``,
                            inline: true,
                        }, {
                            name: 'Mentionable',
                            value: `\`${role.mentionable}\``,
                            inline: true,
                        }, {
                            name: 'Editable',
                            value: `\`${role.editable}\``,
                            inline: true,
                        }, {
                            name: 'Bots',
                            value: `\`${role.members.filter((member) => member.user.bot).size}\``,
                            inline: true,
                        }, {
                            name: 'Members',
                            value: `\`${role.members.filter((member) => !member.user.bot).size}\``,
                            inline: true,
                        }, {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        },
                    ],
                }),
            ],
        });
    },
});
