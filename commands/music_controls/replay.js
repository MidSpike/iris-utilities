'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'REPLAY',
    category:`${DisBotCommander.categories.MUSIC_CONTROLS}`,
    description:'Allows replaying a song',
    aliases:['replay', 'r'],
    async executor(Discord, client, message, opts={}) {
        const server = disBotServers[message.guild.id];
        const thing_to_replay = server.queue_manager.last_removed ?? server.queue_manager.queue[0];
        if (thing_to_replay) {
            server.queue_manager.addItem(thing_to_replay, 1);
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Sorry, I forgot something along the way!',
                description:`It would seem that I'm unable to replay that!`
            }, message));
        }
    },
});
