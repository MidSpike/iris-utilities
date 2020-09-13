'use strict';

//#region local dependencies
const bot_config = require('../../../config.json');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'DONATE',
    category:`${DisBotCommander.categories.INFO}`,
    weight:3,
    description:'provides methods of donating to the bot\'s developers',
    aliases:['donate'],
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title:`Hello there ${message.author.username}!`,
            description:[
                `I was created with the goal of being free for everyone!`,
                `But in order to stay free, I need people to support my development!`,
                `Please consider donating to help keep me free for everyone!`,
                `Thank you for choosing to use ${bot_config.common_name}!`,
            ].join('\n'),
            fields:[
                {
                    name:'GitHub',
                    value:[
                        `${bot_config.github}`,
                        `(click on the **:heart: Sponsor** button)`,
                        `100% of your donation goes directly to the development of ${bot_config.common_name}`,
                    ].join('\n')
                }, {
                    name:'Patreon',
                    value:[
                        `${bot_config.patreon}`,
                        `<95% of your donation goes directly to the development of ${bot_config.common_name}`,
                        `>5% of your donation goes to Patreon`,
                    ].join('\n')
                },
            ]
        }, message));
    },
});
