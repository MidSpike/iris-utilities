'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../src/CustomRichEmbed.js');
const { DisBotCommand } = require('../src/DisBotCommander.js');
const bot_config = require(`../config.json`)
const bot_invite_link = `https://discordapp.com/oauth2/authorize?&client_id=${bot_config.client_id}&scope=bot&permissions=${bot_config.permissions}`;
//#endregion local dependencies

module.exports = new DisBotCommand('invite', ['invite'], (client, message, opts) => {
    message.channel.send(new CustomRichEmbed({
        title:`Hi ${old_message.author.username}!`,
        description:`If you want to invite me to your server, then click below:\n[Add ${bot_config.bot_common_name} to discord server](${bot_invite_link})`
    }))
});
