'use strict';

//#region local dependencies
const safe_stringify = require('json-stringify-safe');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand, registerDisBotCommands } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

//#region eval dependencies
const os = require('os');
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');
const axios = require('axios');
const moment = require('moment-timezone');

const splitString = require('split-string');

const bot_config = require('../../../config.js');

const { Timer, pseudoUniqueId } = require('../../utilities.js');
const { logUserError } = require('../../libs/errors.js');
const { generateInviteToGuild } = require(`../../libs/invites.js`);
const { sendLargeMessage, sendOptionsMessage } = require('../../libs/messages.js');

const { playStream } = require(`../../libs/playStream.js`);
const { createConnection } = require(`../../libs/createConnection.js`);

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
        const { command_prefix, discord_command } = opts;

        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'evaluate_code')) {
            sendNotAllowedCommand(message);
            return;
        }

        console.info(`----------------------------------------------------------------------------------------------------------------`);
        const code_input = message.content.replace(discord_command, ``).trim(); // removes the discord_command and trims
        try {
            console.info(`Running Code:\n`, code_input);

            // const code_with_return = code_input.trim().replace(/((?:.*)(?!\n)(?:.))$/g, `return $1`); // insert 'return' at the beginning of the last line
            const code_to_run = code_input.trim().replace(/\r?\n|\r/g, ``).trim(); // removes line-breaks and trims
            const eval_output = await eval(`(async function() {${code_to_run}})();`);

            console.info(`Output:\n`, eval_output);

            const eval_output_string = typeof eval_output === 'string' ? eval_output : `${safe_stringify(eval_output, null, 2)}`;

            if (discord_command === `${command_prefix}evil`) {
                /* don't output to the channel for the evil command */
            } else {
                message.reply(new CustomRichEmbed({
                    title: 'Evaluated Code',
                    fields: [
                        {
                            name: 'Input',
                            value: `${'```'}\n${discord_command}\n${code_input}\n${'```'}`
                        }, {
                            name: 'Output',
                            value: `${'```'}\n${eval_output_string.length < 1024 ? eval_output_string : `\`Check the console for output!\``}\n${'```'}`
                        },
                    ],
                }));
            }
        } catch (error) {
            console.trace(error);
            message.reply(new CustomRichEmbed({
                color: 0xFF0000,
                title: 'Evaluated Code Resulted In Error',
                fields: [
                    {
                        name: 'Input',
                        value: `${'```'}\n${discord_command}\n${code_input}\n${'```'}`
                    }, {
                        name: 'Error',
                        value: `${'```'}\n${error}\n${'```'}\nCheck the console for more information!`
                    },
                ],
            }));
        }
        console.info(`----------------------------------------------------------------------------------------------------------------`);
    },
});
