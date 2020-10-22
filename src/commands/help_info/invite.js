'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'INVITE',
    category:`${DisBotCommander.categories.HELP_INFO}`,
    weight:12,
    description:'provides the user with an invite link for the bot',
    aliases:['invite'],
    async executor(Discord, client, message, opts={}) {
        const bot_invite_url = await client.generateInvite(['ADMINISTRATOR']).catch(console.trace);
        message.channel.send(new CustomRichEmbed({
            title: `Hi there ${message.author.username}!`,
            description: `If you want to invite me to your server, then click below:\n[Add ${bot_config.COMMON_NAME} to a discord server](${bot_invite_url})`,
        })).catch(console.warn);
    },
});
