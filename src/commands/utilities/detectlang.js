'use strict';

//#region local dependencies
const LanguageDetect = require('languagedetect');
const languageDetector = new LanguageDetect();

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'DETECTLANG',
    category:`${DisBotCommander.categories.UTILITIES}`,
    weight:7,
    description:'Detect Language',
    aliases:['detectlang'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (command_args.join('').length > 0) {
            message.channel.send(new CustomRichEmbed({
                title:`Wants To Know What Language This Is`,
                description:`The language for ${'```' + command_args.join(' ') + '```'} is ${languageDetector.detect(command_args.join(' ')).filter(lang_array => lang_array[0] !== 'pidgin')[0][0]}`
            }, message));
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Uh Oh! What are you trying to do!',
                description:`Proper Command Usage:\`\`\`${discord_command} hallo dort aus Deutschland!\`\`\``
            }, message));
        }
    },
});
