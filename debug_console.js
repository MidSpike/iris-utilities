'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

//---------------------------------------------------------------------------------------------------------------//

const os = require('os');
os.setPriority(0, os.constants.priority.PRIORITY_HIGH);

const moment = require('moment-timezone');

const { IPCModule } = require('@midspike/node-ipc');

//---------------------------------------------------------------------------------------------------------------//

const ipc = new IPCModule();

ipc.config.id = `discord_bot_${process.env.DEBUG_CONSOLE_IPC_ID}`;
ipc.config.retry = 1500;
ipc.config.silent = true;

ipc.serve(() => {
    ipc.server.on('message', (data, socket) => {
        console.log(data);
    });
});

ipc.server.start();

//---------------------------------------------------------------------------------------------------------------//

/* prevent the api server from crashing for unhandledRejections */
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('unhandledRejection at:', reason?.stack ?? reason, promise);
    console.error('----------------------------------------------------------------------------------------------------------------');
});

/* prevent the api server from crashing for uncaughtExceptions */
process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('uncaughtException at:', error);
    console.error('----------------------------------------------------------------------------------------------------------------');
});
