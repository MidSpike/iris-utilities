'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'FLIPCOIN',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Flip a coin',
    aliases:['flipcoin'],
    async executor(Discord, client, message, opts={}) {
        function flipCoin() {
            const coin_chance = Math.random();
            const coin_facing = Math.round(coin_chance) === 1 ? 'heads' : 'tails';
            return { coin_chance, coin_facing };
        }
        const { coin_chance, coin_facing } = flipCoin();
        message.channel.send(new CustomRichEmbed({
            title:'Flipped a coin!',
            description:[
                `**You got __${coin_facing}__**!`,
                `Your chance of getting *heads* was ${(coin_chance * 100).toFixed(3)}%!`
            ].join('\n')
        }, message));
    },
});
