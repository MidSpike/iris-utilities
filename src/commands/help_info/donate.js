'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'DONATE',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 13,
    description: 'provides methods of donating to the bot\'s developers',
    aliases: ['donate'],
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title: `Hello there ${message.author.username}!`,
            description: [
                `I was created with the goal of being free for everyone!`,
                `But in order to stay free, I need people to support my development!`,
                `Please consider donating to help keep me free for everyone!`,
                `Thank you for choosing to use me!`,
            ].join('\n'),
            fields: [
                {
                    name: 'GitHub',
                    value: [
                        `${bot_config.DONATION_SOURCES.GITHUB}`,
                        `100% of your donation goes directly to the development of ${bot_config.COMMON_NAME}`,
                        `0% of your donation goes to GitHub`,
                    ].join('\n'),
                }, {
                    name: 'PayPal',
                    value: [
                        `${bot_config.DONATION_SOURCES.PAYPAL}`,
                        `95% of your donation goes directly to the development of ${bot_config.COMMON_NAME}`,
                        `5% of your donation goes to PayPal`,
                    ].join('\n'),
                }, {
                    name: 'Patreon',
                    value: [
                        `${bot_config.DONATION_SOURCES.PATREON}`,
                        `95% of your donation goes directly to the development of ${bot_config.COMMON_NAME}`,
                        `5% of your donation goes to Patreon`,
                    ].join('\n'),
                },
            ],
        }, message));
    },
});
