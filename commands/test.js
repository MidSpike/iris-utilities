//#region Local Dependencies
const util = require('../utilities.js');
const DisBotCommand = util.DisBotCommand;
//#endregion

module.exports = new DisBotCommand('TEST', ['test'], (client, message, opts) => {
    message.channel.send(new util.CustomRichEmbed({
        title:`Hello World! I'm ${client.user.username}!`
    }));
});
