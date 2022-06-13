//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

const translateUsingGoogle = require('translate-google');

//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'Translate To English',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.Message,
        description: '', // required for the command to be registered, silly discord
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_AND_DMS,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
        ],
    },
    async handler(discord_client, interaction) {
        if (!interaction.isMessageContextMenuCommand()) return;
        if (!interaction.inCachedGuild()) return;

        await interaction.deferReply({ ephemeral: false });

        const message = interaction.targetMessage;
        if (!message) {
            return interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        description: `${interaction.user}, I couldn't find the message.`,
                    }),
                ],
            });
        }

        const query = message.cleanContent;
        if (!query.length) {
            return interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        description: [
                            `${interaction.user}, you can only use this command on messages that have content.`,
                            'For example: embeds, attachments, and reactions are not supported.',
                        ].join('\n'),
                    }),
                ],
            });
        }

        const translated_query: string = await translateUsingGoogle(query, { to: 'en' });

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Translation To English',
                    description: [
                        `${interaction.user}, here is the english translation of that message:`,
                        '\`\`\`',
                        translated_query,
                        '\`\`\`',
                    ].join('\n'),
                }),
            ],
        });
    },
});
