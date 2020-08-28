'use strict';

//#region local dependencies
const axios = require('axios');

const { Timer, array_random, array_make } = require('../../utilities.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'CARDS',
    category:`${DisBotCommander.categories.FUN}`,
    description:'Cards Against Humanity',
    aliases:['cards'],
    async executor(Discord, client, message, opts={}) {
        if (!message.channel.nsfw) {
            message.channel.send(new CustomRichEmbed({
                title:'This command requires an NSFW channel!',
                description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
            }, message));
            return;
        }
        message.channel.send(new CustomRichEmbed({
            title:`Cards Against Humanity`,
            description:'Fetching random card set!\nPlease wait...'
        })).then(async bot_message => {
            await Timer(1500);
            const cards_api_res = await axios.get(`https://cards-against-humanity-api.herokuapp.com/sets/Base`);
            const black_card = array_random(cards_api_res.data.blackCards.filter(card => card.pick === 2));
            const white_cards = array_make(black_card.pick).map(() => array_random(cards_api_res.data.whiteCards));
            bot_message.edit(new CustomRichEmbed({
                title:`Cards Against Humanity`,
                fields:[
                    {name:'Black Card', value:`\`\`\`${black_card.text}\`\`\``},
                    ...white_cards.map(card => ({name:'White Card', value:`\`\`\`${card}\`\`\``, inline:true}))
                ]
            }, message));
        });
    },
});
