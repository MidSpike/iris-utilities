//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberHavePermission, isMemberAboveOtherMember } from '@root/common/app/permissions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'timeout',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'timeouts a user in the guild',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.User,
                name: 'member',
                description: 'the guild member or id to timeout',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'duration',
                description: 'the duration of the timeout in minutes',
                choices: [
                    {
                        name: '1 Minute',
                        value: 1,
                    }, {
                        name: '5 Minutes',
                        value: 5,
                    }, {
                        name: '15 Minutes',
                        value: 15,
                    }, {
                        name: '30 Minutes',
                        value: 30,
                    }, {
                        name: '1 Hour',
                        value: 60,
                    }, {
                        name: '6 Hours',
                        value: 6 * 60,
                    }, {
                        name: '12 Hours',
                        value: 12 * 60,
                    }, {
                        name: '1 Day',
                        value: 24 * 60,
                    }, {
                        name: '3 Days',
                        value: 5 * 24 * 60,
                    }, {
                        name: '1 Week',
                        value: 7 * 24 * 60,
                    }, {
                        name: '2 Weeks',
                        value: 14 * 24 * 60,
                    }, {
                        name: '1 Month',
                        value: 28 * 24 * 60, // discord only allows for 28 days
                    },
                ],
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'reason',
                description: 'the reason for the timeout',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.GuildStaff,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.ModerateMembers,
        ],
        command_category: ClientCommandHelper.categories.GUILD_STAFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply();

        const is_user_allowed_to_timeout = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.ModerateMembers);
        if (!is_user_allowed_to_timeout) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, you do not have permission to timeout members`,
                    }),
                ],
            });

            return;
        }

        const member = interaction.options.getMember('member');
        const duration_in_minutes = interaction.options.getInteger('duration', false) ?? 5; // default to 5 minutes if not specified
        const reason = Discord.escapeMarkdown(
            interaction.options.getString('reason', false) || 'no reason was provided'
        );

        if (!member) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you must specify a valid user to timeout!`,
                    }),
                ],
            });

            return;
        }

        const bot_member = await interaction.guild.members.fetchMe();
        if (!isMemberAboveOtherMember(bot_member, member)) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, I\'m not allowed to timeout ${member}.`,
                    }),
                ],
            });

            return;
        }

        const member_has_admin_permission = await doesMemberHavePermission(member, Discord.PermissionFlagsBits.Administrator);
        if (member_has_admin_permission) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, I cannot timeout an administrator!`,
                    }),
                ],
            });

            return;
        }

        if (!isMemberAboveOtherMember(interaction.member, member)) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you are not allowed to timeout ${member}!`,
                    }),
                ],
            });

            return;
        }

        const duration_in_milliseconds = duration_in_minutes * 60_000;

        try {
            await member.timeout(duration_in_milliseconds, reason);
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, failed to timeout ${member} in the server!`,
                        fields: [
                            {
                                name: 'Error Message',
                                value: [
                                    '\`\`\`',
                                    `${error}`,
                                    '\`\`\`',
                                ].join('\n'),
                            },
                        ],
                    }),
                ],
            });

            return;
        }

        const timeout_until_timestamp = `${Date.now() + duration_in_milliseconds}`.slice(0, -3);

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.user}, successfully timed out ${member}!`,
                    fields: [
                        {
                            name: 'Until',
                            value: `<t:${timeout_until_timestamp}:R>`,
                        }, {
                            name: 'Reason',
                            value: [
                                '\`\`\`',
                                `${reason}`,
                                '\`\`\`',
                            ].join('\n'),
                        },
                    ],
                }),
            ],
        });
    },
});
