//#region local dependencies
const { CustomRichEmbed } = require('../src/CustomRichEmbed.js');
const { DisBotCommand } = require('../src/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand('IBMGOOGLETTS', ['ibmtts', 'googletts'], (client, message, opts) => {
    message.channel.send(new CustomRichEmbed({
        color:0xFFFF00,
        title:'Uh Oh! This command no longer exists!',
        description:`Check out \`${opts.command_prefix}tts\``
    }, message));
});
