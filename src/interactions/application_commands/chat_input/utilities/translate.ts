//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { compareTwoStrings } from 'string-similarity';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

import * as LibreTranslate from '@root/common/app/libre_translate';

//------------------------------------------------------------//

const fetchSupportedLanguages = (() => {
    let supported_languages: LibreTranslate.LanguageConfig[];

    return async () => {
        if (supported_languages) return supported_languages;

        // eslint-disable-next-line require-atomic-updates
        supported_languages = await LibreTranslate.fetchSupportedLanguages();

        return supported_languages;
    };
})();

//------------------------------------------------------------//

export default new ClientInteraction<Discord.ChatInputApplicationCommandData>({
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
        allowed_execution_environment: ClientCommandHelper.ExecutionEnvironments.GuildOnly,
        required_user_access_level: ClientCommandHelper.AccessLevels.Everyone,
        required_bot_permissions: [
            Discord.PermissionFlagsBits.ViewChannel,
            Discord.PermissionFlagsBits.SendMessages,
            Discord.PermissionFlagsBits.Connect,
            Discord.PermissionFlagsBits.Speak,
        ],
        command_category: ClientCommandHelper.categories.UTILITIES,
    },
    async handler(discord_client, interaction) {
        if (!interaction.inCachedGuild()) return;

        const supported_languages = await fetchSupportedLanguages();

        if (interaction.type === Discord.InteractionType.ApplicationCommandAutocomplete) {
            const query_option = interaction.options.getFocused(true);

            const matching_languages = supported_languages.map(
                (language) => ({
                    score: Math.max(
                        (query_option.value.length < 10 ? compareTwoStrings(query_option.value, language.code) : 0),
                        (query_option.value.length > 3 ? compareTwoStrings(query_option.value, language.name) : 0),
                        (language.name.toLowerCase().startsWith(query_option.value.toLowerCase()) ? 1 : 0)
                    ),
                    language: language,
                })
            ).sort(
                (a, b) => b.score - a.score
            ).map(
                (language) => language.language
            ).filter(
                // if the query option is 'to' then remove 'auto'
                (language) => (query_option.name === 'to' ? language.code !== 'auto' : true)
            );

            interaction.respond(
                matching_languages.map(
                    (language) => ({
                        name: language.name,
                        value: language.code,
                    })
                ).slice(0, 5)
            );

            return;
        }

        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const text_to_translate = interaction.options.getString('text', true);
        const translate_to_code = interaction.options.getString('to', false);
        const translate_from_code = interaction.options.getString('from', false);

        const translated_from_language = supported_languages.find(
            (language) =>
                language.code === translate_from_code ||
                language.name === translate_from_code
        ) ?? supported_languages.find(
            (language) => language.code === 'auto'
        )!;

        const translated_to_language = supported_languages.find(
            (language) =>
                language.code === translate_to_code ||
                language.name === translate_to_code
        ) ?? supported_languages.find(
            (language) => language.code === 'en'
        )!;

        const translated_text = await LibreTranslate.translate(text_to_translate, translated_from_language.code, translated_to_language.code);

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
                        text: 'Translated using Libre Translate',
                    },
                }),
            ],
        });
    },
});
