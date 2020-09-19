'use strict';

const { client } = require('../../libs/bot.js');

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'rateLimit',
    async callback(rate_limit_info) {
        if (client.$.restarting_bot) return;

        console.log(`----------------------------------------------------------------------------------------------------------------`);
        console.log(`client#rateLimit:`, rate_limit_info);
        console.log(`----------------------------------------------------------------------------------------------------------------`);
    }
};