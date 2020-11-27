'use strict';

//#region local dependencies
const { createConnection } = require('../../libs/createConnection.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'REPLAY',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 9,
    description: 'Allows replaying a song',
    aliases: ['replay', 'r'],
    cooldown: 10_000,
    async executor(Discord, client, message, opts={}) {
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        const voice_channel = message.member.voice.channel;
        if (!voice_channel) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: `Well that's an issue!`,
                description: `You need to be in a voice channel to use this command!`,
            }, message));
            return;
        }

        const thing_to_replay = guild_queue_manager.last_removed ?? guild_queue_manager.queue[0];
        if (thing_to_replay) {
            await createConnection(voice_channel, false); // create a connection before adding an item to the queue
            guild_queue_manager.addItem(thing_to_replay, 1);
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Sorry, I forgot something along the way!',
                description: `It would seem that I'm unable to replay that!`,
            }, message));
        }
    },
});
