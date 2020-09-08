'use strict';

//#region local dependencies
const axios = require('axios');

const { Timer } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_api_url = process.env.BOT_API_SERVER_URL;

module.exports = new DisBotCommand({
    name:'GOOGLETRANSLATE',
    category:`${DisBotCommander.categories.UTILITIES}`,
    description:'Google Translate',
    aliases:['googletranslate'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, clean_command_args } = opts;

        const user_text = clean_command_args.join(' ');

        if (user_text.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`Couldn't Trnaslate:`,
                description:`Try typing a sentence after the command!`,
                fields:[
                    {name:'Example Usage', value:`${discord_command} hallo dort aus Deutschland!`}
                ]
            }, message));
        } else {
            const lang_code_match = user_text.match(/\{(.*)\}/);
            const translate_to = lang_code_match ? lang_code_match.pop() : 'en';
            const translate_this = user_text.replace(`{${translate_to}}`, '').trim();

            const bot_message = await message.channel.send(new CustomRichEmbed({
                title:'Translating...',
                description:`${'```'}\n${translate_this}\n${'```'}`
            }, message));

            const api_response = await axios.get(`${bot_api_url}/translate?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&translate_to=${encodeURIComponent(translate_to)}&text=${encodeURIComponent(user_text)}`);

            const { original_text,
                    translated_from_language,
                    translated_to_language,
                    translated_text } = api_response.data;

            await Timer(1500);

            bot_message.edit(new CustomRichEmbed({
                title:'Translated!',
                fields:[
                    {name:`From {${translated_from_language}}`, value:`${'```'}\n${original_text}\n${'```'}`},
                    {name:`To {${translated_to_language}}`, value:`${'```'}\n${translated_text}\n${'```'}`}
                ]
            }, message));
        }
    },
});
