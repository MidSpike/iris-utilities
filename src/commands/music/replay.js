'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'REPLAY',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:9,
    description:'Allows replaying a song',
    aliases:['replay', 'r'],
    async executor(Discord, client, message, opts={}) {
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        const thing_to_replay = guild_queue_manager.last_removed ?? guild_queue_manager.queue[0];
        if (thing_to_replay) {
            guild_queue_manager.addItem(thing_to_replay, 1);
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Sorry, I forgot something along the way!',
                description:`It would seem that I'm unable to replay that!`
            }, message));
        }
    },
});
