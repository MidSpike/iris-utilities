'use strict';

//------------------------------------------------------------//

import axios from 'axios';

import Discord from 'discord.js';

import { CustomEmbed } from '../../../../common/app/message';

import { ClientInteraction, ClientCommandHelper } from '../../../../common/app/client_interactions';

//------------------------------------------------------------//

type DefinitionApiResult = {
    word: string;
    phonetics?: {
        text: string;
        audio: string;
    }[];
    meanings: {
        partOfSpeech: string;
        definitions: {
            definition: string;
            example: string;
            synonyms: string[];
            antonyms: string[];
        }[];
    }[];
};

//------------------------------------------------------------//

module.exports.default = new ClientInteraction({
    identifier: 'define',
    type: Discord.Constants.InteractionTypes.APPLICATION_COMMAND,
    data: {
        type: Discord.Constants.ApplicationCommandTypes.CHAT_INPUT,
        description: 'n/a',
        options: [
            {
                type: Discord.Constants.ApplicationCommandOptionTypes.STRING,
                name: 'english-word',
                description: 'the english word to define',
                required: true,
            },
        ],
    },
    metadata: {
        allowed_execution_environment: ClientCommandHelper.execution_environments.GUILD_ONLY,
        required_user_access_level: ClientCommandHelper.access_levels.EVERYONE,
        required_bot_permissions: [
            Discord.Permissions.FLAGS.VIEW_CHANNEL,
            Discord.Permissions.FLAGS.SEND_MESSAGES,
        ],
        command_category: ClientCommandHelper.categories.get('UTILITIES'),
    },
    async handler(discord_client, interaction) {
        if (!interaction.isCommand()) return;

        await interaction.deferReply({ ephemeral: false });

        const english_phrase = interaction.options.getString('english-word', true);

        const api_response = await axios({
            method: 'get',
            url: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(english_phrase)}`,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 1000,
        }).catch((res) => res);

        if (api_response.status !== 200) {
            console.log({
                api_response,
            });

            await interaction.editReply({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Something went wrong!',
                        description: 'Perhaps that was an unknown English word, or maybe a server issue occurred!',
                    }),
                ],
            });

            return;
        }

        const dictionary_api_results: DefinitionApiResult[] = api_response.data;

        if (dictionary_api_results.length < 1) {
            await interaction.followUp({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.YELLOW,
                        title: 'Something went wrong!',
                        description: 'Perhaps that was an unknown English word, or maybe a server issue occurred!',
                    }),
                ],
            });

            return;
        }

        const {
            word: word,
            phonetics: word_phonetics,
            meanings: word_meanings,
        } = dictionary_api_results.at(0) as DefinitionApiResult;

        const {
            text: word_pronunciation_text,
            audio: word_pronunciation_audio_url,
        } = word_phonetics?.at(0) ?? {};

        const {
            partOfSpeech: word_part_of_speech,
            definitions: word_definitions_and_examples,
        } = word_meanings[0] ?? {};

        console.log({
            word,
            word_pronunciation_text,
            word_pronunciation_audio_url,
            word_part_of_speech,
            word_definitions_and_examples,
        });

        await interaction.followUp({
            embeds: [
                CustomEmbed.from({
                    title: `Definitions for: ${word}`,
                    description: [
                        ...(word_part_of_speech ? [ `*(${word_part_of_speech})*` ] : []),
                        ...(word ? [ word ] : []),
                        ...(word_pronunciation_text ? [ word_pronunciation_text ] : []),
                        ...(word_pronunciation_audio_url ? [ `([pronunciation](${word_pronunciation_audio_url.replace(/^\/\//gi, 'https://')}))` ] : []),
                    ].join(' — '),
                }),
                ...(word_definitions_and_examples ? (
                    word_definitions_and_examples.slice(0, 10).map(({ definition, example, synonyms, antonyms }) =>
                        CustomEmbed.from({
                            description: [
                                ...(definition?.length ? [
                                    `**Definition:**\n${definition}`,
                                ] : []),
                                ...(example?.length ? [
                                    `**Example:**\n${example}`,
                                ] : []),
                                ...(synonyms?.length ? [
                                    `**Synonyms:**\n${synonyms.slice(0, 3).map(s => `- ${s}`).join('\n')}`,
                                ] : []),
                                ...(antonyms?.length ? [
                                    `**Antonyms:**\n${antonyms.slice(0, 3).map(s => `- ${s}`).join('\n')}`,
                                ] : []),
                            ].join('\n\n'),
                        })
                    ).slice(0, 9)
                ) : []),
            ],
        });
    },
});
