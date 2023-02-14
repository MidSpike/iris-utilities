//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberHavePermission } from '@root/common/app/permissions';

import { delay } from '@root/common/lib/utilities';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'yoink',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'yoinks a user to your voice channel',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'a_member',
                description: 'yoinks a single member to your voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.User,
                        name: 'member',
                        description: 'the guild member to yoink',
                        required: true,
                    }, {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yoink',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'all_users',
                description: 'yoinks all users to your voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yoink',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'all_bots',
                description: 'yoinks all bots to your voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yoink',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'everyone',
                description: 'yoinks everyone to your voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yoink',
                        required: false,
                    },
                ],
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.GuildStaff,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.MoveMembers,
        ],
        command_category: ClientCommandHelper.categories.GUILD_STAFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const is_user_allowed_to_yoink = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.MoveMembers);
        if (!is_user_allowed_to_yoink) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, you do not have permission to yoink!`,
                    }),
                ],
            });

            return;
        }

        const subcommand_name = interaction.options.getSubcommand(true) as 'a_member' | 'all_users' | 'all_bots' | 'everyone';
        const member = subcommand_name === 'a_member' ? interaction.options.getMember('member') : null;
        const reason = Discord.escapeMarkdown(
            interaction.options.getString('reason', false) || 'no reason was provided'
        );

        const current_voice_channel = interaction.member.voice.channel;
        if (!current_voice_channel) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you must be in a voice channel to yoink people!`,
                    }),
                ],
            });

            return;
        }

        const all_members_connected_to_a_voice_channel = interaction.guild.members.cache.filter((member) => Boolean(member.voice.channel));
        const all_members_in_a_different_voice_channel = all_members_connected_to_a_voice_channel.filter((member) => member.voice.channelId !== current_voice_channel.id);

        const members_to_yoink = new Set<Discord.GuildMember>();
        switch (subcommand_name) {
            case 'a_member': {
                if (!member) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Yellow,
                                description: `${interaction.user}, you must specify a valid member to yoink!`,
                            }),
                        ],
                    });

                    return;
                }

                const member_voice_channel = member.voice.channel;
                if (!member_voice_channel) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Yellow,
                                description: `${interaction.user}, ${member} is not in a voice channel!`,
                            }),
                        ],
                    });

                    return;
                }

                if (member_voice_channel.id === current_voice_channel.id) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Yellow,
                                description: `${interaction.user}, ${member} is already in your voice channel!`,
                            }),
                        ],
                    });

                    return;
                }

                members_to_yoink.add(member);

                break;
            }

            case 'all_users': {
                const voice_channel_users = all_members_in_a_different_voice_channel.filter((member) => !member.user.bot);

                for (const member of voice_channel_users.values()) {
                    members_to_yoink.add(member);
                }

                break;
            }

            case 'all_bots': {
                const voice_channel_bots = all_members_in_a_different_voice_channel.filter((member) => member.user.bot);

                for (const member of voice_channel_bots.values()) {
                    members_to_yoink.add(member);
                }

                break;
            }

            case 'everyone':
            default: {
                for (const member of all_members_in_a_different_voice_channel.values()) {
                    members_to_yoink.add(member);
                }

                break;
            }
        }

        try {
            for (const member of members_to_yoink.values()) {
                await member.voice.setChannel(current_voice_channel, `${interaction.user} yoinked ${members_to_yoink.size} member(s) to ${current_voice_channel} for ${reason}`);

                await delay(250);
            }
        } catch (error) {
            console.warn(error);

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, an error occurred while yoinking!`,
                    }),
                ],
            });

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.user}, successfully yoinked ${members_to_yoink.size} member(s)!`,
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
