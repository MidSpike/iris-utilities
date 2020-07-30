//#region Local Dependencies
const util = require('../utilities.js');
const DisBotCommand = util.DisBotCommand;
//#endregion

module.exports = new DisBotCommand('IBMGOOGLETTS', ['ibmtts', 'googletts'], (client, message, opts) => {
    message.channel.send(new util.CustomRichEmbed({
        color:0xFFFF00,
        title:'Uh Oh! This command no longer exists!',
        description:`Check out \`${opts.command_prefix}tts\``
    }, message));
});
