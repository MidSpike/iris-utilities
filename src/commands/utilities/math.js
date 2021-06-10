'use strict';

//#region dependencies
const MathJS = require('mathjs');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'MATH',
    category: `${DisBotCommander.categories.UTILITIES}`,
    weight: 2,
    description: 'Evaluate Math',
    aliases: ['math'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (command_args.length > 0) {
            const math_to_evaluate = command_args.join(' ');
            try {
                const evaluated_math = MathJS.evaluate(math_to_evaluate);
                message.channel.send({
                    embed: new CustomRichEmbed({
                        title: 'I evaluated your math for you!',
                        description: `\`${math_to_evaluate}\` = \`${evaluated_math}\``,
                    }, message),
                });
            } catch {
                message.channel.send({
                    embed: new CustomRichEmbed({
                        title: 'I failed you!',
                        description: `I couldn't evaluate \`${math_to_evaluate}\``,
                    }, message),
                });
            }
        } else {
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: 'Command Usage',
                    description: `${'```'}\n${discord_command} 2 + 2\n${'```'}`,
                }, message),
            });
        }
    },
});
