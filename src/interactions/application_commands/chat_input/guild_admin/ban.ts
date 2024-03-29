//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberHavePermission, isMemberAboveOtherMember } from '@root/common/app/permissions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'ban',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'bans a user from the guild',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.User,
                name: 'member',
                description: 'the guild member or id to ban',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'reason',
                description: 'the reason for the ban',
                required: false,
            }, {
                type: Discord.ApplicationCommandOptionType.Boolean,
                name: 'remove_recent_messages',
                description: 'remove messages sent by the user in the last 7 days',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.GuildAdmin,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.BanMembers,
        ],
        command_category: ClientCommandHelper.categories.GUILD_ADMIN,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const is_user_allowed_to_ban = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.BanMembers);
        if (!is_user_allowed_to_ban) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, you do not have permission to ban members`,
                    }),
                ],
            });

            return;
        }

        const user = interaction.options.getUser('member', true);
        const reason = Discord.escapeMarkdown(
            interaction.options.getString('reason', false) || 'no reason was provided'
        );
        const remove_recent_messages = interaction.options.getBoolean('remove_recent_messages', false) ?? false;

        if (!user) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you must specify a valid user to ban!`,
                    }),
                ],
            });

            return;
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => undefined);
        if (member) {
            if (!member.bannable) {
                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Yellow,
                            description: `${interaction.user}, I\'m not allowed to ban ${member}!`,
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
                            description: `${interaction.user}, I\'m not allowed to ban ${member}.`,
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
                            description: `${interaction.user}, you are not allowed to ban ${member}!`,
                        }),
                    ],
                });

                return;
            }
        }

        try {
            await interaction.guild.members.ban(user, {
                reason: reason,
                ...(remove_recent_messages ? {
                    days: 7, // `7` is the maximum allowed by Discord
                } : {}),
            });
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, failed to ban ${user} from the server!`,
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

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.user}, successfully banned ${user} from the server!`,
                    fields: [
                        {
                            name: 'Reason',
                            value: [
                                '\`\`\`',
                                `${reason}`,
                                '\`\`\`',
                            ].join('\n'),
                        }, {
                            name: 'Removed recent messages',
                            value: `${remove_recent_messages}`,
                        },
                    ],
                }),
            ],
        });
    },
});
