'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { sendNotAllowedCommand } = require('../../src/messages.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../src/permissions.js');

const util = require("util");
const child_process = require("child_process");
const eval_shell = util.promisify(child_process.exec);
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SHELL',
    category:`${DisBotCommander.categories.BOT_OWNER}`,
    description:'shell',
    aliases:['shell'],
    access_level:DisBotCommand.access_levels.BOT_OWNER,
    async executor(Discord, client, message, opts={}) {
        const { discord_command } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'shell')) {
            sendNotAllowedCommand(message);
            return;
        }
        const shell_input = message.content.replace(discord_command, ``).trim(); // Removes the discord_command and trims
        console.info(`----------------------------------------------------------------------------------------------------------------`);
        try {
            const code_to_run = `${shell_input.replace(/\r?\n|\r/g, '').trim()}`; // Removes line-breaks and trims
            console.info(`Running Shell Code:`, code_to_run);
            const shell_output = await eval_shell(`${code_to_run}`);
            console.info(`Output:`, shell_output);
            const shell_output_string = `${shell_output.stdout}`;
            message.reply(new CustomRichEmbed({
                title:'Evaluated Shell Code',
                fields:[
                    {name:'Input', value:`${'```'}\n${discord_command}\n${shell_input}\n${'```'}`},
                    {name:'Output', value:`${'```'}\n${shell_output_string.length < 1024 ? shell_output_string : `\`Check the console for output!\``}\n${'```'}`}
                ]
            }));
        } catch (error) {
            console.trace(error);
            message.reply(new CustomRichEmbed({
                color:0xFF0000,
                title:'Evaluated Shell Code Resulted In Error',
                fields:[
                    {name:'Input', value:`${'```'}\n${discord_command}\n${shell_input}\n${'```'}`},
                    {name:'Error', value:`${'```'}\n${error}\n${'```'}\nCheck the console for more information!`}
                ]
            }));
        }
        console.info(`----------------------------------------------------------------------------------------------------------------`);
    },
});
