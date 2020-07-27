//#region Local Dependencies
const util = require('../utilities.js');
const DisBotCommand = util.DisBotCommand;
//#endregion

const cmd = new DisBotCommand('ibmgoogletts', 'This is the outdated tts command.', (client, message, opts) => {
    message.channel.send(new util.CustomRichEmbed({
        color:0xFFFF00,
        title:'Uh Oh! This command no longer exists!',
        description:`Check out \`${cp}tts\``
    }));
});

module.exports = {
    cmd,
};
