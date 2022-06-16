//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as fs from 'node:fs';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import { CustomEmbed } from '@root/common/app/message';

import { compareTwoStrings } from 'string-similarity';

import { ClientCommandHelper, ClientInteraction } from '@root/common/app/client_interactions';

const translateUsingGoogle = require('translate-google');

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
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
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
