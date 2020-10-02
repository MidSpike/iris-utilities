'use strict';

//#region local dependencies
const bot_config = require('../../../config.js');

const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'SUPERPEOPLE',
    category: `${DisBotCommander.categories.SUPER_PEOPLE}`,
    description: 'super people',
    aliases: ['superpeople'],
    access_level: DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts = {}) {
        message.author
            .createDM()
            .then((dm_channel) => {
                sendLargeMessage(dm_channel.id, JSON.stringify(bot_config.SUPER_PEOPLE, null, 2));
            })
            .catch(console.warn);
    },
});
