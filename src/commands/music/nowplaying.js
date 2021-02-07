'use strict';

//#region dependencies
const { string_ellipses } = require('../../utilities.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendYtDiscordEmbed } = require('../../libs/messages.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'NOWPLAYING',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 13,
    description: 'Shows the user what is currently playing',
    aliases: ['nowplaying', 'np'],
    async executor(Discord, client, message, opts = {}) {
        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length > 0) {
            const current_queue_item = guild_queue_manager.queue[0];

            switch (current_queue_item.type) {
                case 'youtube':
                    sendYtDiscordEmbed(message, current_queue_item.metadata.videoInfo, 'Now Playing');
                    break;
                case 'tts':
                    message.channel.send(new CustomRichEmbed({
                        title: `Now Playing: ${current_queue_item.type.toUpperCase()}`,
                        description: `${string_ellipses(current_queue_item.metadata.text, 25)}`,
                    }));
                    break;
                case 'mp3':
                    message.channel.send(new CustomRichEmbed({
                        title: `Now Playing: ${current_queue_item.type.toUpperCase()}`,
                        description: `${current_queue_item.metadata.mp3_file_name}`
                    }));
                    break;
                default:
                    message.channel.send(new CustomRichEmbed({
                        title: `Now Playing: ${current_queue_item.type.toUpperCase()}`,
                    }));
                    break;
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Nothing is playing right now!',
                description: 'Try using this command when I\'m playing something!',
            }, message));
        }
    },
});
