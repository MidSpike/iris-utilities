'use strict';

//---------------------------------------------------------------------------------------------------------------//

const ipc = require('node-ipc');

ipc.config.id = `discord_bot_${process.env.DEBUG_CONSOLE_IPC_ID}`;
ipc.config.retry = 1500;
ipc.config.silent = true;

ipc.connectTo(ipc.config.id);

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    event_name: 'debug',
    async callback(debug_info) {
        ipc.of[ipc.config.id].emit('message', [
            `----------------------------------------------------------------------------------------------------------------`,
            `client#debug: ${debug_info}`,
            `----------------------------------------------------------------------------------------------------------------`,
        ].join('\n'));
    },
};
