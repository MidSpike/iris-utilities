'use strict';

//#region local dependencies
const bot_config = require('../../../config.json');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'PATREON',
    category:`${DisBotCommander.categories.INFO}`,
    weight:3,
    description:'invites the developer to the server',
    aliases:['patreon'],
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title:`Hello there ${message.author.username}!`,
            description:[
                `I was created with the goal of being free for everyone!`,
                `But in order to stay free, I need people to [support my patreon](${bot_config.patreon})!`,
                `Even a small amount would help greatly to pay for my server costs!`,
                `Thank you for choosing to use ${bot_config.common_name}!`
            ].join('\n')
        }, message));
    },
});
