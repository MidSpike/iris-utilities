'use strict';

//#region dependencies
const safe_stringify = require('json-stringify-safe');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander,
        registerDisBotCommands } = require('../../libs/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { isSuperPerson,
        isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion dependencies

//#region eval dependencies
const os = require('os');
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');
const axios = require('axios');
const moment = require('moment-timezone');

const youtubeSearch = require('youtube-search');

const splitString = require('split-string');

const bot_config = require('../../../config.js');

const { Timer,
        pseudoUniqueId } = require('../../utilities.js');
const { logUserError } = require('../../libs/errors.js');
const { generateInviteToGuild } = require(`../../libs/invites.js`);
const { sendLargeMessage,
        sendOptionsMessage,
        sendCaptchaMessage } = require('../../libs/messages.js');

const { playStream } = require(`../../libs/playStream.js`);
const { createConnection } = require(`../../libs/createConnection.js`);

const bot_cdn_url = process.env.BOT_CDN_URL;
const bot_api_url = `${process.env.BOT_API_SERVER_URL}:${process.env.BOT_API_SERVER_PORT}`;
//#endregion eval dependencies

module.exports = new DisBotCommand({
    name: 'EVAL',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'eval',
    aliases: ['eval', 'evil'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command } = opts;

        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'evaluate_code')) {
            sendNotAllowedCommand(message);
            return;
        }

        console.info('----------------------------------------------------------------------------------------------------------------');
        const eval_input = message.content.replace(discord_command, ``).trim(); // removes the discord_command and trims
        try {
            let code_to_run = eval_input;
            console.info('Running Code:\n', code_to_run);

            if (!code_to_run.match(/\r?\n|\r/g)) { // there is more than one line of code
                code_to_run = `return ${code_to_run.replace('return', '')}`; // insert 'return' at the beginning of the line
            }

            code_to_run = code_to_run.replace(/\r?\n|\r/g, ``).trim(); // removes line-breaks and trims

            // code_to_run = code_to_run.replace(/((?:.*)(?!\n)(?:.))$/g, `return $1`); // insert 'return' at the beginning of the last line

            const code_has_return_statement = code_to_run.match(/(return)/g);

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
                            value: `${'```'}\n${discord_command}\n${eval_input}\n${'```'}`,
                        }, {
                            name: 'Output',
                            value: [
                                `${'```'}`,
                                !code_has_return_statement ? (
                                    'No return statement was specified!'
                                ) : (
                                    eval_output_string.length < 1024 ? (
                                        eval_output_string
                                    ) : (
                                        '\`Check the console for output!\`'
                                    )
                                ),
                                `${'```'}`,
                            ].join('\n'),
                        },
                    ],
                    footer: null,
                }, message));
            }
        } catch (error) {
            console.trace(error);
            message.reply(new CustomRichEmbed({
                color: 0xFF0000,
                title: 'Evaluated Code Resulted In Error',
                fields: [
                    {
                        name: 'Input',
                        value: `${'```'}\n${discord_command}\n${eval_input}\n${'```'}`,
                    }, {
                        name: 'Error',
                        value: `${'```'}\n${error}\n${'```'}\nCheck the console for more information!`,
                    },
                ],
            }));
        }
        console.info('----------------------------------------------------------------------------------------------------------------');
    },
});
