'use strict';

//#region dependencies
const { DisBotCommander,
        DisBotCommand } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { constructNumberUsingEmoji } = require('../../libs/emoji.js');
const { random_range_inclusive } = require('../../utilities.js');
//#endregion dependencies

/**
 * Rolls a specified number of n-sided dice
 * @param {Number} number_of_dice 
 * @param {Number} number_of_sides 
 * @returns {number[]} an array containing the number each die landed on
 */
function rollDice(number_of_dice=1, number_of_sides=6) {
    if (typeof number_of_dice !== 'number') throw new TypeError('\`number_of_dice\` must be a number');
    if (typeof number_of_sides !== 'number') throw new TypeError('\`number_of_sides\` must be a number');

    /** @type {number[]} */
    const dice = [];

    for (let i = 0; i < number_of_dice; i++) {
        dice[i] = random_range_inclusive(1, number_of_sides);
    }

    return dice;
}

module.exports = new DisBotCommand({
    name: 'ROLLDICE',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'Roll dice',
    aliases: ['rolldice'],
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;

        /**
         * Allows for arguments to passed as '5d20' to get [5, 20]
         * Also allows for '' to turn into []
         * @type {number[]} 
         */
        const [ number_of_dice=1, number_of_sides=6 ] = command_args.join('').split(/\D+/i).filter(item => !!item).map(item => parseInt(item));

        if (number_of_dice > 100) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Why are you even trying that?',
                description: 'More than 100 dice is a bit too much for me :)',
            }, message)).catch(console.warn);
            return;
        }

        const rolled_dice = rollDice(number_of_dice, number_of_sides);
        const combined_dice_value = rolled_dice.reduce((a,b) => a + b, 0);

        message.channel.send(new CustomRichEmbed({
            title: `Rolled ${number_of_dice}, ${number_of_sides ?? 6}-sided dice!`,
            description: number_of_dice === 1 ? (
                `You rolled a ${(await constructNumberUsingEmoji(combined_dice_value))}`
            ) : (
                `You rolled \`${rolled_dice.join(' + ')}\` = ${(await constructNumberUsingEmoji(combined_dice_value))}`
            ),
        }, message)).catch(console.warn);
    },
});
