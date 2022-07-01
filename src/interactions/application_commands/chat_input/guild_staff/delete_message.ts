//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { delay } from '@root/common/lib/utilities';

import { doesMemberHavePermission } from '@root/common/app/permissions';

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'delete_message',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'deletes a message',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'message_id',
                description: 'the message id to delete',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.Channel,
                name: 'from_channel',
                description: 'you can specify the channel to improve loading time',
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

        const message_id = interaction.options.getString('message_id', true);
        const from_channel = interaction.options.getChannel('from_channel', false);

        const is_user_allowed_to_manage_messages = await doesMemberHavePermission(interaction.member, Discord.PermissionFlagsBits.ManageMessages);
        if (!is_user_allowed_to_manage_messages) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, you do not have permission to manage messages.`,
                    }),
                ],
            });

            return;
        }

        if (from_channel && !from_channel.isTextBased()) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, the channel you specified is not a text-based channel.`,
                    }),
                ],
            });

            return;
        }

        const channels_to_look_in = from_channel ? [ from_channel ] : interaction.guild.channels.cache.filter(channel => channel.isTextBased()).values();

        let message: Discord.Message | undefined;
        for (const channel of channels_to_look_in) {
            if (!channel.isTextBased()) continue;

            message = await channel.messages.fetch(message_id).catch(() => undefined);

            if (message) break;

            await delay(50); // small delay to avoid being rate limited
        }

        if (!message) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: `${interaction.user}, you must specify a valid message id to delete!`,
                    }),
                ],
            });

            return;
        }

        try {
            await message.delete();
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, failed to delete message \`${message.id}\`.`,
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
                    description: `${interaction.user}, successfully deleted a message.`,
                    fields: [
                        {
                            name: 'Message Id',
                            value: `[${message.id}](${message.url})`,
                            inline: true,
                        }, {
                            name: 'Author',
                            value: `${message.author}`,
                            inline: true,
                        },
                    ],
                }),
            ],
        });
    },
});
