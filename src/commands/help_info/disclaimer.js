'use strict';

//#region dependencies
const bot_config = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name: 'DISCLAIMER',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 15,
    description: 'Shows the user the privacy disclaimer',
    aliases: ['disclaimer', 'privacy'],
    async executor(Discord, client, message, opts={}) {
        await message.channel.send({
            embed: new CustomRichEmbed({
                title: 'Privacy Disclaimer Inbound!',
                description: `You can view the privacy disclaimer here ${bot_config.GITHUB}/blob/master/PRIVACY.md`,
                image: `${bot_cdn_url}/law-and-justice.jpg`,
            }, message),
        });
    },
});
