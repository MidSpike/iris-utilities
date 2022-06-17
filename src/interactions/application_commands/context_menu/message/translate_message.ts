//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as fs from 'node:fs';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import { compareTwoStrings } from 'string-similarity';

import { CustomEmbed } from '@root/common/app/message';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

const translateUsingGoogle = require('@midspike/translate-google');

//------------------------------------------------------------//

const google_translate_languages: {
    code: string,
    name: string,
}[] = JSON.parse(
    fs.readFileSync(
        path.join(process.cwd(), 'misc', 'google_translate_languages.json'),
        {
            encoding: 'utf8',
        }
    )
);

//------------------------------------------------------------//

export default new ClientInteraction<Discord.MessageApplicationCommandData>({
    identifier: 'Translate Message',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.Message,
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

        const message = interaction.targetMessage;

        const text_to_translate = message.cleanContent;
        if (!text_to_translate.length) {
            interaction.reply({
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

            return;
        }

        await interaction.showModal(
            new Discord.ModalBuilder()
                .setTitle('Translate Message')
                .setCustomId('translate_message_modal')
                .setComponents([
                    new Discord.ActionRowBuilder<Discord.ModalActionRowComponentBuilder>()
                        .setComponents([
                            new Discord.TextInputBuilder()
                                .setCustomId('translate_message_modal_to_query')
                                .setStyle(Discord.TextInputStyle.Short)
                                .setLabel('What language are you translating to?')
                                .setPlaceholder('English')
                                .setMinLength(2)
                                .setMaxLength(25),
                        ]),
                ]),
        );

        const modal_submit_interaction = await interaction.awaitModalSubmit({
            time: 5 * 60_000,
        }).catch(() => undefined);
        if (!modal_submit_interaction) return;

        const translate_to_query = modal_submit_interaction.fields.getTextInputValue('translate_message_modal_to_query');

        await modal_submit_interaction.deferReply();

        const translate_to_language = google_translate_languages.map(language => ({
            score: Math.max(
                compareTwoStrings(translate_to_query, language.name),
                compareTwoStrings(translate_to_query, language.code),
            ),
            language: language,
        })).sort(
            (a, b) => b.score - a.score
        ).map(
            language => language.language
        ).filter(
            language => language.code !== 'auto'
        ).at(0)!;

        const translated_text: string = await translateUsingGoogle(text_to_translate, {
            from: 'auto',
            to: translate_to_language.code,
        });

        await modal_submit_interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: `Translated to ${translate_to_language.name}`,
                    description: [
                        `${modal_submit_interaction.user}, here is the translation of that [message](${message.url}):`,
                        '\`\`\`',
                        translated_text,
                        '\`\`\`',
                    ].join('\n'),
                }),
            ],
        });
    },
});
