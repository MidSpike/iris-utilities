'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

/**
 * @typedef {'heads'|'tails'} CoinFacing
 */

/**
 * Flips a virtual coin
 * @returns {CoinFacing} 
 */
function flipCoin() {
    return Math.round(Math.random()) === 1 ? 'heads' : 'tails';
}

module.exports = new DisBotCommand({
    name: 'FLIPCOIN',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'flips a virtual coin',
    aliases: ['flipcoin', 'coinflip'],
    async executor(Discord, client, message, opts={}) {
        const coin_facing = flipCoin();

        message.channel.send(new CustomRichEmbed({
            title: 'Flipped a coin!',
            description: `**You got __${coin_facing}__**!`,
            thumbnail: `${process.env.BOT_CDN_URL}/Coin-${coin_facing === 'heads' ? 'H' : 'T'}_2020-09-18_b0.png`,
        }, message)).catch(console.warn);
    },
});
