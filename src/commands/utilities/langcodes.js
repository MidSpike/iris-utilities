'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');

const google_languages_json = require('../../../files/google_languages.json');
const ibm_languages_json = require('../../../files/ibm_languages.json');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'LANGCODES',
    category:`${DisBotCommander.categories.UTILITIES}`,
    description:'Language Codes',
    aliases:['langcodes'],
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;
        if (command_args[0] === 'ibm') {
            message.channel.send(new CustomRichEmbed({
                title:`Here are the language codes that you can use with ${command_prefix}tts`,
                description:`${Object.entries(ibm_languages_json).map(item => `\`{${item[0]}}\` — ${item[1]}`).join('\n')}`,
                fields:[
                    {name:'Example usage:', value:`${'```'}\n${command_prefix}tts {en-GB_KateV3Voice} Oi mate, watcha doing there!${'```'}`}
                ]
            }, message));
        } else if (command_args[0] === 'google') {
            message.channel.send(new CustomRichEmbed({
                title:`Here are the language codes that you can use with ${command_prefix}tts and ${command_prefix}googletranslate`,
                description:`${Object.entries(google_languages_json).map(item => `\`{${item[0]}}\` — ${item[1]}`).join('\n')}`,
                fields:[
                    {name:'Example usage:', value:`${'```'}\n${command_prefix}tts {en-uk} Oi mate, watcha doing there!${'```'}`},
                    {name:'Example usage:', value:`${'```'}\n${command_prefix}googletranslate {de} This will be translated to German!${'```'}`}
                ]
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Try the following commands instead!',
                description:`${'```'}\n${discord_command} ibm\n${'```'}or${'```'}\n${discord_command} google\n${'```'}`
            }));
        }
    },
});
