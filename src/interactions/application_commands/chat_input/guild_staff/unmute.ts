//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberHavePermission, isMemberAboveOtherMember } from '@root/common/app/permissions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'unmute',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'unmutes a user in the guild',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.User,
                name: 'member',
                description: 'the guild member to unmute',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'reason',
                description: 'the reason for the unmute',
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.GUILD_STAFF,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.MuteMembers,
        ],
        command_category: ClientCommandHelper.categories.GUILD_STAFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const is_user_allowed_to_mute = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.MuteMembers);
        if (!is_user_allowed_to_mute) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, you do not have permission to unmute members`,
                    }),
                ],
            });

            return;
        }

        const member = interaction.options.getMember('member');
        const reason = Discord.escapeMarkdown(
            interaction.options.getString('reason', false) || 'no reason was provided'
        );

        if (!member) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you must specify a valid user to unmute!`,
                    }),
                ],
            });

            return;
        }

        const bot_member = await interaction.guild.members.fetch(discord_client.user.id);
        if (!isMemberAboveOtherMember(bot_member, member)) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, I\'m not allowed to unmute ${member}!`,
                    }),
                ],
            });

            return;
        }

        if (!isMemberAboveOtherMember(interaction.member, member)) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you are not allowed to unmute ${member}!`,
                    }),
                ],
            });

            return;
        }

        try {
            await member.voice.setMute(false, `Muted by ${interaction.user} for ${reason}`);
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, failed to unmute ${member}!`,
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
                    color: CustomEmbed.colors.GREEN,
                    description: `${interaction.user}, successfully unmuted ${member}!`,
                    fields: [
                        {
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