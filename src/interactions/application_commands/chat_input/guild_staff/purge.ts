//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { doesMemberHavePermission } from '@root/common/app/permissions';

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
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.GUILD_STAFF,
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
                        color: CustomEmbed.colors.RED,
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
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you must specify a valid number of messages to purge!`,
                    }),
                ],
            });

            return;
        }

        if (!channel || !channel.isTextBased()) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you must specify a valid text-based channel to purge messages from!`,
                    }),
                ],
            });

            return;
        }

        let deleted_messages: Discord.Collection<Discord.Snowflake, Discord.Message>;
        try {
            deleted_messages = await channel.bulkDelete(number_of_messages, true);
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
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

            return;
        }

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    color: CustomEmbed.colors.GREEN,
                    description: `${interaction.user}, successfully purged ${deleted_messages.size} messages from ${channel}.`,
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
