'use strict';

//#region local dependencies
const safe_stringify = require('json-stringify-safe');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../src/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../src/permissions.js');
//#endregion local dependencies

//#region eval dependencies
const os = require('os');
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');
const axios = require('axios');
const moment = require('moment-timezone');
const { Timer } = require('../../utilities.js');
const { logUserError } = require('../../src/errors.js');

const bot_config = require('../../config.json');

const bot_cdn_url = process.env.BOT_CDN_URL;
const bot_api_url = process.env.BOT_API_SERVER_URL;
//#endregion eval dependencies

module.exports = new DisBotCommand({
    name:'EVAL',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'eval',
    aliases:['eval', 'evil'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'evaluate_code')) {
            sendNotAllowedCommand(message);
            return;
        }
        const code_input = message.content.replace(discord_command, ``).trim(); // Removes the discord_command and trims
        console.info(`----------------------------------------------------------------------------------------------------------------`);
        try {
            const code_to_run = `'use strict'; ${code_input.replace(/\r?\n|\r/g, '').trim()}`; // Removes line-breaks and trims
            console.info(`Running Code:`, code_to_run);
            const eval_output = await eval(`${code_to_run.indexOf('await') > -1 ? (`(async function() {${code_to_run.startsWith('await') ? `return ${code_to_run};` : `${code_to_run}`}})();`) : code_to_run}`);
            console.info(`Output:`, eval_output);
            const eval_output_string = safe_stringify(eval_output, null, 2);
            message.reply(new CustomRichEmbed({
                title:'Evaluated Code',
                fields:[
                    {name:'Input', value:`${'```'}js\n${discord_command}\n${code_input}\n${'```'}`},
                    {name:'Output', value:`${'```'}js\n${eval_output_string?.length < 1024 ? eval_output_string : `\`Check the console for output!\``}\n${'```'}`}
                ]
            }));
        } catch (error) {
            console.trace(error);
            message.reply(new CustomRichEmbed({
                color:0xFF0000,
                title:'Evaluated Code Resulted In Error',
                fields:[
                    {name:'Input', value:`${'```'}js\n${discord_command}\n${code_input}\n${'```'}`},
                    {name:'Error', value:`${'```'}js\n${error}\n${'```'}\nCheck the console for more information!`}
                ]
            }));
        }
        console.info(`----------------------------------------------------------------------------------------------------------------`);
    },
});
