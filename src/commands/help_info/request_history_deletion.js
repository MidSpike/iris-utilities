'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

const history_deletion_requests_channel_id = process.env.BOT_LOGGING_CHANNEL_HISTORY_DELETION_REQUESTS_ID;

module.exports = new DisBotCommand({
    name:'REQUEST_HISTORY_DELETION',
    category:`${DisBotCommander.categories.HELP_INFO}`,
    weight:17,
    description:'Allows the user to request their history to be deleted',
    aliases:['request_history_deletion'],
    async executor(Discord, client, message, opts={}) {
        const history_deletion_requests_channel = client.channels.cache.get(history_deletion_requests_channel_id);
        await history_deletion_requests_channel.send(`@${message.author.tag} (${message.author.id}) Requested to have their history deleted!`).catch(console.trace);
        message.reply(new CustomRichEmbed({
            title: 'Success! Your command history will be deleted within 24 hours!',
            description: `Keep in mind that essential data (such as ban records) will not be deleted!`,
        }, message)).catch(console.warn);
    },
});
