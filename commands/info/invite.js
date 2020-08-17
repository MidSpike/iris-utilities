'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const bot_config = require(`../../config.json`);
const bot_invite_link = `https://discordapp.com/oauth2/authorize?&client_id=${bot_config.client_id}&scope=bot&permissions=${bot_config.permissions}`;
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'INVITE',
    category:`${DisBotCommander.categories.INFO}`,
    description:'provides the user with an invite link for the bot',
    aliases:['invite'],
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title:`Hi there ${message.author.username}!`,
            description:`If you want to invite me to your server, then click below:\n[Add ${bot_config.common_name} to a discord server](${bot_invite_link})`
        }));
    },
});
