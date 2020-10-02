'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
const { random_range_inclusive, array_make } = require('../../utilities.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'ROLLDICE',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Roll dice',
    aliases: ['rolldice'],
    async executor(Discord, client, message, opts = {}) {
        const { command_args } = opts;
        function rollDice(count = 1, sides = 6) {
            const dice = [];
            for (let die in array_make(count)) {
                const _dice_number = random_range_inclusive(1, sides);
                dice[die] = _dice_number;
            }
            return dice;
        }
        if (command_args.join('').length > 0) {
            try {
                const dice_args = command_args.join('').split(/[a-z]+/i); // Split using any letter (aka d)
                const rolled_dice = rollDice(parseInt(dice_args[0] ?? 1), parseInt(dice_args[1] ?? 6));
                await message.channel.send(
                    new CustomRichEmbed(
                        {
                            title: `${dice_args[0]}, ${dice_args[1] ?? 6}-sided dice coming right up!`,
                            description: `You rolled \`${rolled_dice.join(` + `)}\` = ${constructNumberUsingEmoji(
                                rolled_dice.reduce((a, b) => a + b),
                            )}`,
                        },
                        message,
                    ),
                );
            } catch (error) {
                console.warn(`Ignore!`, error);
                message.channel.send(
                    new CustomRichEmbed(
                        {
                            color: 0xffff00,
                            title: 'What the f---!',
                            description: `I can't roll dice like that!\nTry rolling a \`5d20\` or a \`20\` instead!`,
                        },
                        message,
                    ),
                );
            }
        } else {
            message.channel.send(
                new CustomRichEmbed(
                    {
                        title: 'Rolled a 6-sided die!',
                        description: `You rolled a ${constructNumberUsingEmoji(rollDice(1, 6)[0])}`,
                    },
                    message,
                ),
            );
        }
    },
});
