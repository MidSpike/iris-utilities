'use strict';

//#region dependencies
const MathJS = require('mathjs');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand, DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name:'MATH',
    category:`${DisBotCommander.categories.UTILITIES}`,
    weight:2,
    description:'Evaluate Math',
    aliases:['math'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const math_to_evaluate = command_args.join(' ').trim();

        if (math_to_evaluate.length === 0) {
            message.channel.send(new CustomRichEmbed({
                title: 'Command Usage',
                description: `${'```'}\n${discord_command} 2 + 2\n${'```'}`
            }, message)).catch(console.warn);
        }

        try {
            const evaluated_math = MathJS.evaluate(math_to_evaluate);
            await message.channel.send(new CustomRichEmbed({
                title: 'I evaluated your math for you!',
                description: `\`${math_to_evaluate}\` = \`${evaluated_math}\``,
            }, message));
        } catch {
            message.channel.send(new CustomRichEmbed({
                title: 'Something went wrong!',
                description: `I couldn't evaluate \`${math_to_evaluate}\``,
            }, message)).catch(console.warn);
        }
    },
});
