'use strict';

const { client } = require('../../libs/bot.js');

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'warn',
    async callback(warning) {
        if (client.$.restarting_bot) return;

        console.warn(
            `----------------------------------------------------------------------------------------------------------------`,
        );
        console.warn(`client#warn:`, warning);
        console.warn(
            `----------------------------------------------------------------------------------------------------------------`,
        );
    },
};
