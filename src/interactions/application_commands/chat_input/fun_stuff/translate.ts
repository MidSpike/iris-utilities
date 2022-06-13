//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { compareTwoStrings } from 'string-similarity';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

const translateUsingGoogle = require('translate-google');

//------------------------------------------------------------//

const google_translate_languages = [
    { code: 'auto', name: 'Automatically Detect' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'sq', name: 'Albanian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hy', name: 'Armenian' },
    { code: 'ca', name: 'Catalan' },
    { code: 'zh', name: 'Chinese' },
    { code: 'zh-cn', name: 'Chinese (Mandarin/China)' },
    { code: 'zh-tw', name: 'Chinese (Mandarin/Taiwan)' },
    { code: 'zh-yue', name: 'Chinese (Cantonese)' },
    { code: 'hr', name: 'Croatian' },
    { code: 'cs', name: 'Czech' },
    { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' },
    { code: 'en', name: 'English' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'fi', name: 'Finnish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'el', name: 'Greek' },
    { code: 'ht', name: 'Haitian Creole' },
    { code: 'hi', name: 'Hindi' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'is', name: 'Icelandic' },
    { code: 'id', name: 'Indonesian' },
    { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'la', name: 'Latin' },
    { code: 'lv', name: 'Latvian' },
    { code: 'mk', name: 'Macedonian' },
    { code: 'no', name: 'Norwegian' },
    { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pt-br', name: 'Portuguese (Brazil)' },
    { code: 'ro', name: 'Romanian' },
    { code: 'ru', name: 'Russian' },
    { code: 'sr', name: 'Serbian' },
    { code: 'sk', name: 'Slovak' },
    { code: 'es', name: 'Spanish' },
    { code: 'es-es', name: 'Spanish (Spain)' },
    { code: 'es-us', name: 'Spanish (United States)' },
    { code: 'sw', name: 'Swahili' },
    { code: 'sv', name: 'Swedish' },
    { code: 'ta', name: 'Tamil' },
    { code: 'th', name: 'Thai' },
    { code: 'tr', name: 'Turkish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'cy', name: 'Welsh' },
];


//------------------------------------------------------------//

export default new ClientInteraction({
    identifier: 'translate',
    type: Discord.InteractionType.ApplicationCommand,
    data: {
        type: Discord.ApplicationCommandType.ChatInput,
        description: 'translate text to another language.',
        options: [
            {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'text',
                description: 'the text to speak',
                required: true,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'to',
                description: 'the language to translate to',
                autocomplete: true,
                required: false,
            }, {
                type: Discord.ApplicationCommandOptionType.String,
                name: 'from',
                description: 'the language to translate from',
                autocomplete: true,
                required: false,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.get('FUN_STUFF'),
    },
    async handler(discord_client, interaction) {
        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const query_option = interaction.options.getFocused(true);

            const matching_languages = google_translate_languages.map(language => ({
                score: compareTwoStrings(`${query_option.value}`, language.name),
                language: language,
            })).sort(
                (a, b) => b.score - a.score
            ).map(
                language => language.language
            ).filter(
                // if the query option is 'to' then remove 'auto'
                language => query_option.name === 'to' && language.code !== 'auto'
            );

            interaction.respond(
                matching_languages.map(language => ({
                    name: language.name,
                    value: language.code,
                })).slice(0, 5)
            );

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const text_to_translate = interaction.options.getString('text', true);
        const translate_to_code = interaction.options.getString('to', false);
        const translate_from_code = interaction.options.getString('from', false);

        const translated_from_language = google_translate_languages.find(language =>
            language.code === translate_from_code ||
            language.name === translate_from_code
        ) ?? google_translate_languages.find(language => language.code === 'auto')!;
        const translated_to_language = google_translate_languages.find(language =>
            language.code === translate_to_code ||
            language.name === translate_to_code
        ) ?? google_translate_languages.find(language => language.code === 'en')!;

        const translated_text: string = await translateUsingGoogle(text_to_translate, {
            from: translated_from_language.code,
            to: translated_to_language.code,
        });

        await interaction.editReply({
            embeds: [
                CustomEmbed.from({
                    title: 'Translation',
                    description: [
                        `${interaction.user}, here is the translation.`,
                    ].join('\n'),
                    fields: [
                        {
                            name: `From ${translated_from_language.name}`,
                            value: [
                                '\`\`\`',
                                text_to_translate,
                                '\`\`\`',
                            ].join('\n'),
                        }, {
                            name: `To ${translated_to_language.name}`,
                            value: [
                                '\`\`\`',
                                translated_text,
                                '\`\`\`',
                            ].join('\n'),
                        },
                    ],
                    footer: {
                        text: 'Translated using Google Translate',
                    },
                }),
            ],
        });
    },
});
