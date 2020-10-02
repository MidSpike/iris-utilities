'use strict';

const { client } = require('../../libs/bot.js');

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'invalidated',
    async callback(error) {
        if (client.$.restarting_bot) return;

        console.warn(`----------------------------------------------------------------------------------------------------------------`);
        console.warn(`Bot session was invalidated!`);
        console.warn(`----------------------------------------------------------------------------------------------------------------`);
        process.exit(1); // stop this process and restart it via the .bat script
    }
};
