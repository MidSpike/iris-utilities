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
    identifier: 'yeet',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'yeets a user to a random voice channel',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'a_member',
                description: 'yeets a single member from the voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.User,
                        name: 'member',
                        description: 'the guild member to yeet',
                        required: true,
                    }, {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yeet',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'all_users',
                description: 'yeets all users from the voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yeet',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'all_bots',
                description: 'yeets all bots from the voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yeet',
                        required: false,
                    },
                ],
            }, {
                type: Discord.ApplicationCommandOptionType.Subcommand,
                name: 'everyone',
                description: 'yeets everyone from the voice channel',
                options: [
                    {
                        type: Discord.ApplicationCommandOptionType.String,
                        name: 'reason',
                        description: 'the reason for the yeet',
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

        await interaction.deferReply();

        const is_user_allowed_to_yeet = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.MoveMembers);
        if (!is_user_allowed_to_yeet) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, you do not have permission to yeet!`,
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
                        description: `${interaction.user}, you must be in a voice channel to yeet people!`,
                    }),
                ],
            });

            return;
        }

        const voice_channel_members = current_voice_channel.members;

        const members_to_yeet = new Set<Discord.GuildMember>();
        switch (subcommand_name) {
            case 'a_member': {
                if (!member) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Yellow,
                                description: `${interaction.user}, you must specify a valid member to yeet!`,
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

                if (member_voice_channel.id !== current_voice_channel.id) {
                    await interaction.editReply({
                        embeds: [
                            CustomEmbed.from({
                                color: CustomEmbed.Colors.Yellow,
                                description: `${interaction.user}, ${member} is not in the same voice channel as you!`,
                            }),
                        ],
                    });

                    return;
                }

                members_to_yeet.add(member);

                break;
            }

            case 'all_users': {
                const voice_channel_users = voice_channel_members.filter((member) => !member.user.bot);

                for (const member of voice_channel_users.values()) {
                    members_to_yeet.add(member);
                }

                break;
            }

            case 'all_bots': {
                const voice_channel_bots = voice_channel_members.filter((member) => member.user.bot);

                for (const member of voice_channel_bots.values()) {
                    members_to_yeet.add(member);
                }

                break;
            }

            case 'everyone':
            default: {
                for (const member of voice_channel_members.values()) {
                    members_to_yeet.add(member);
                }

                break;
            }
        }

        const random_voice_channel = interaction.guild.channels.cache.find(
            (channel) => channel.isVoiceBased() && channel.id !== current_voice_channel.id
        ) as Discord.VoiceBasedChannel | undefined;

        if (!random_voice_channel) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, there are no other voice channels to yeet people to!`,
                    }),
                ],
            });

            return;
        }

        try {
            for (const member of members_to_yeet.values()) {
                await member.voice.setChannel(random_voice_channel, `${interaction.user} yeeted ${members_to_yeet.size} member(s) to ${random_voice_channel} for ${reason}`);

                await delay(250);
            }
        } catch (error) {
            console.warn(error);

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, an error occurred while yeeting!`,
                    }),
                ],
            });

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.user}, successfully yeeted ${members_to_yeet.size} member(s)!`,
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
