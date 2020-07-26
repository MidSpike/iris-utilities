//#region Local Dependencies
const util = require('../utilities.js');
const DisBotCommand = util.DisBotCommand;
//#endregion

const TEST_COMMAND = new DisBotCommand('TEST', 'this is a test of the new command system', (client, message, opts) => {
    message.channel.send(`Hello World! I'm ${client.user.username}!`);
});

module.exports = {
    TEST_COMMAND,
};
