'use strict';

//#region local dependencies
const bot_config = require('../../../config.json');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const bot_cdn_url = process.env.BOT_CDN_URL;

module.exports = new DisBotCommand({
    name:'PRIVACY_DISCLAIMER',
    category:`${DisBotCommander.categories.INFO}`,
    weight:5,
    description:'Shows the user the privacy disclaimer',
    aliases:['privacy_disclaimer'],
    async executor(Discord, client, message, opts={}) {
        await message.channel.send(new CustomRichEmbed({
            title:'Privacy Disclaimer Inbound!',
            description:`You can view the privacy disclaimer here ${bot_config.github}/blob/master/PRIVACY.md`,
            image:`${bot_cdn_url}/law-and-justice.jpg`
        }, message));
    },
});
