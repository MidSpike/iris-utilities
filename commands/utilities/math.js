'use strict';

//#region local dependencies
const MathJS = require('mathjs');

const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'MATH',
    category:`${DisBotCommander.categories.UTILITIES}`,
    description:'Evaluate Math',
    aliases:['math'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;
        if (command_args.length > 0) {
            const math_to_evaluate = command_args.join(' ');
            try {
                const evaluated_math = MathJS.evaluate(math_to_evaluate);
                message.channel.send(new CustomRichEmbed({
                    title:'I evaluated your math for you!',
                    description:`\`${math_to_evaluate}\` = \`${evaluated_math}\``
                }, message));
            } catch {
                message.channel.send(new CustomRichEmbed({
                    title:'I failed you!',
                    description:`I couldn't evaluate \`${math_to_evaluate}\``
                }, message));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                title:'Command Usage',
                description:`${'```'}\n${discord_command} 2 + 2\n${'```'}`
            }, message));
        }
    },
});
