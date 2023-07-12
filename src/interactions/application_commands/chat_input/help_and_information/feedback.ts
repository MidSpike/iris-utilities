//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import { sendWebhookMessage } from '@root/common/app/webhook';

//------------------------------------------------------------//

const feedback_webhook_url = parseEnvironmentVariable(EnvironmentVariableName.DiscordBotCentralLoggingFeedbackWebhook, 'string');

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
    identifier: 'feedback',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'sends feedback to my developers',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'message',
                description: 'tell us what you think',
                minLength: 16,
                maxLength: 1024,
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
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.HELP_AND_INFORMATION,
    },
    async handler(discord_client, interaction) {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (!interaction.channel) return;

        await interaction.deferReply({ ephemeral: true });

        const feedback_message = interaction.options.getString('message', true);

        try {
            await sendWebhookMessage(
                feedback_webhook_url,
                {
                    embeds: [
                        CustomEmbed.from({
                            author: {
                                icon_url: interaction.user.displayAvatarURL({ forceStatic: false, size: 4096 }),
                                name: `@${interaction.user.username} (${interaction.user.id})`,
                            },
                            description: [
                                '\`\`\`',
                                feedback_message,
                                '\`\`\`',
                            ].join('\n'),
                        }).toJSON(),
                    ],
                },
            );
        } catch (error) {
            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: 0xFF0000,
                        title: 'Something went wrong!',
                        description: 'I was unable to send your feedback to my developers. Please try again later.',
                    }),
                ],
            });

            return;
        }

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: 'Thank you for your feedback!',
                    description: [
                        `${interaction.user}, I sent the following message to my developers:`,
                        '\`\`\`',
                        Discord.escapeMarkdown(feedback_message),
                        '\`\`\`',
                    ].join('\n'),
                }),
            ],
        });
    },
});
