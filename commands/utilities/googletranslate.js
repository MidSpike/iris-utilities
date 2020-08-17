'use strict';

//#region local dependencies
const GoogleTranslate = require('translate-google');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'GOOGLETRANSLATE',
    category:`${DisBotCommander.categories.UTILITIES}`,
    description:'Google Translate',
    aliases:['googletranslate'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (command_args.join('').length > 0) {
            const lang_code_match = command_args.join(' ').match(/\{(.*)\}/);
            const translate_to = lang_code_match ? lang_code_match.pop() : 'en';
            const translate_this = command_args.join(' ').replace(`{${translate_to}}`, '').trim();
            GoogleTranslate(translate_this, {to:translate_to}).then(translated_text => {
                message.channel.send(new CustomRichEmbed({
                    title:'Time to translate!',
                    fields:[
                        {name:'Translated', value:`\`\`\`${translate_this}\`\`\``},
                        {name:`To <${translate_to}>`, value:`\`\`\`${translated_text}\`\`\``}
                    ]
                }, message));
            }).catch(console.trace);
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Uh Oh! What are you trying to do!',
                description:`Proper Command Usage:\`\`\`${discord_command} hallo dort aus Deutschland!\`\`\``
            }, message));
        }
    },
});
