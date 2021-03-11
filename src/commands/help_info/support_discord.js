'use strict';

//#region dependencies
const { COMMON_NAME: bot_common_name } = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

const bot_support_guild_invite_url = `https://discord.gg/${process.env.BOT_SUPPORT_GUILD_INVITE_CODE}`;

module.exports = new DisBotCommand({
    name: 'SUPPORT_DISCORD',
    category: `${DisBotCommander.categories.HELP_INFO}`,
    weight: 16,
    description: 'Generates an invite to the support server',
    aliases: ['support_discord'],
    async executor(Discord, client, message, opts={}) {
        message.channel.send(new CustomRichEmbed({
            title: `Hey ${message.author.username}, you can speak with my support staff here!`,
            description: `Click to join the [${bot_common_name} Support Discord](${bot_support_guild_invite_url})!`,
        }, message)).catch(console.warn);
    },
});
