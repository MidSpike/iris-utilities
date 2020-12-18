'use strict';

//#region local dependencies
const axios = require('axios');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'DEFINE',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 8,
    description: 'defines english words',
    aliases: ['define'],
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        const search_query = command_args.join(' ').trim();
        if (search_query.length > 0) {
            const api_response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${search_query}`).catch((res) => res);

            if (api_response.status !== 200) {
                message.channel.send(new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Something went wrong!',
                    description: 'Perhaps that isn\'t a valid English word, or a server issue has occurred!',
                }, message));
                return;
            }

            const api_response_data = api_response.data;

            const {
                word: word,
                phonetics: word_phonetics,
                meanings: word_meanings,
            } = api_response_data[0] ?? {};

            const {
                text: word_pronunciation_text,
                audio: word_pronunciation_audio_url,
            } = word_phonetics[0] ?? {};

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

            message.channel.send(new CustomRichEmbed({
                title: `Definitions for: ${word}`,
                description: `*(${word_part_of_speech})* — **${word}** — [${word_pronunciation_text ?? ''}](${word_pronunciation_audio_url})`,
                fields: word_definitions_and_examples.map((word_definition_and_example, index) => ({
                    name: `\u200B`,
                    value: [
                        `**Definition:**\n${word_definition_and_example.definition}`,
                        `**Example:**\n${word_definition_and_example.example}`,
                    ].join('\n'),
                })),
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'This command can be used to define english words',
                description: 'Try typing a word after the command next time!',
            }, message));
        }
    },
});
