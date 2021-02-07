'use strict';

//#region dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'AUTOPLAY',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 11,
    description: 'Automatically plays related YouTube items in the queue',
    aliases: ['autoplay', 'a'],
    async executor(Discord, client, message, opts={}) {
        if (!message.guild.me.voice.connection) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh! What are you doing there mate!',
                description: 'I\'m not in a voice channel!',
            }, message)).catch(console.warn);
            return;
        }

        if (message.member.voice.channelID !== message.guild.me.voice.channelID) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh! What are you doing there mate!',
                description: 'You aren\'t in my voice channel!',
            }, message)).catch(console.warn);
            return;
        }

        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length === 0) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh! What are you doing there mate!',
                description: 'Nothing is playing right now!',
            }, message)).catch(console.warn);
            return;
        }

        await guild_queue_manager.toggleAutoplay();
        message.channel.send(new CustomRichEmbed({
            title: `${guild_queue_manager.autoplay_enabled ? 'Enabled' : 'Disabled'} autoplay of related youtube videos in the queue`,
        }, message)).catch(console.warn);
    },
});
