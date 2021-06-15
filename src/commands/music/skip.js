'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'SKIP',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 8,
    description: 'allows skipping of item in the queue',
    aliases: ['skip', 's', 'next', 'n'],
    cooldown: 5_000,
    async executor(Discord, client, message, opts={}) {
        if (!message.guild.me.voice.connection) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'Uh Oh! What are you doing there mate!',
                        description: 'I\'m not in a voice channel!',
                    }, message),
                ],
            }).catch(console.warn);
            return;
        }

        if (message.member.voice.channelID !== message.guild.me.voice.channelID) {
            message.channel.send({
                embeds: [
                    new CustomRichEmbed({
                        color: 0xFFFF00,
                        title: 'Uh Oh! What are you doing there mate!',
                        description: 'You aren\'t in my voice channel!',
                    }, message),
                ],
            }).catch(console.warn);
            return;
        }

        const guild_audio_controller = client.$.audio_controllers.get(message.guild.id);
        await guild_audio_controller.skip();
        message.channel.send({
            embeds: [
                new CustomRichEmbed({
                    title: 'Skipped the current song!',
                }, message),
            ],
        });
    },
});
