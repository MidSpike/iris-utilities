'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'FLIPCOIN',
    category: `${DisBotCommander.categories.FUN}`,
    description: 'flips a virtual coin',
    aliases: ['flipcoin', 'coinflip'],
    async executor(Discord, client, message, opts = {}) {
        function flipCoin() {
            const coin_chance = Math.random();
            const coin_facing = Math.round(coin_chance) === 1 ? 'heads' : 'tails';
            return { coin_chance, coin_facing };
        }
        const { coin_facing } = flipCoin();
        message.channel.send(
            new CustomRichEmbed(
                {
                    title: 'Flipped a coin!',
                    description: `**You got __${coin_facing}__**!`,
                    thumbnail: `${process.env.BOT_CDN_URL}/Coin-${
                        coin_facing === 'heads' ? 'H' : 'T'
                    }_2020-09-18_b0.png`,
                },
                message,
            ),
        );
    },
});
