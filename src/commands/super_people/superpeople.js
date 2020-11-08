'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendLargeMessage } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'SUPERPEOPLE',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'super people',
    aliases: ['superpeople'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const dm_channel = await message.author.createDM().catch(console.warn);
        sendLargeMessage(dm_channel.id, JSON.stringify(bot_config.SUPER_PEOPLE, null, 2), 'json');
    },
});
