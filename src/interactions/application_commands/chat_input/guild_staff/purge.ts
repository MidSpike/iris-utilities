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
    identifier: 'purge',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'purges a number of messages from a channel',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.Integer,
                name: 'number_of_messages',
                description: 'the amount of messages to remove (doesn\'t include command response by default)',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.Channel,
                name: 'channel',
                description: 'the channel to remove the messages from',
                required: false,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'reason',
                description: 'the reason for removing the messages',
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
            Discord.PermissionFlagsBits.ManageMessages,
        ],
        command_category: ClientCommandHelper.categories.GUILD_STAFF,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: false });

        const is_user_allowed_to_manage_messages = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.ManageMessages);
        if (!is_user_allowed_to_manage_messages) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Red,
                        description: `${interaction.user}, you do not have permission to delete messages`,
                    }),
                ],
            });

            return;
        }

        const number_of_messages = interaction.options.getInteger('number_of_messages', true);
        const channel = interaction.options.getChannel('channel', false) ?? interaction.channel;
        const reason = Discord.escapeMarkdown(
            interaction.options.getString('reason', false) || 'no reason was provided'
        );

        if (number_of_messages < 1) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you must specify a valid number of messages to purge!`,
                    }),
                ],
            });

            return;
        }

        if (number_of_messages > 1000) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you cannot purge more than 1000 messages at a time!`,
                    }),
                ],
            });

            return;
        }

        if (!channel || !channel.isTextBased()) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Yellow,
                        description: `${interaction.user}, you must specify a valid text-based channel to purge messages from!`,
                    }),
                ],
            });

            return;
        }

        let num_messages_removed_total = 0;
        let num_messages_remaining_to_remove = number_of_messages;

        while (num_messages_remaining_to_remove > 0) {
            let num_messages_removed = 0;
            try {
                num_messages_removed = await channel.bulkDelete(number_of_messages, true).then(
                    (deleted_messages) => deleted_messages.size
                );
            } catch (error) {
                await interaction.editReply({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Red,
                            description: `${interaction.user}, failed to purge messages!`,
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

                break;
            }

            if (num_messages_removed < 1) break;

            num_messages_removed_total += num_messages_removed;
            num_messages_remaining_to_remove -= num_messages_removed;

            if (num_messages_remaining_to_remove > 0) await delay(1_000); // delay to prevent rate limiting
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.Colors.Green,
                    description: `${interaction.user}, purged ${num_messages_removed_total} messages from ${channel}.`,
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
