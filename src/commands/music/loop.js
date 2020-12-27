'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { sendMusicControllerEmbed } = require('../../libs/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name: 'LOOP',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 14,
    description: 'Loops items in the queue',
    aliases: ['loop', 'l'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length > 0) {
            if (['item', 'i'].includes(command_args[0])) {
                await guild_queue_manager.toggleLoop();
                await guild_queue_manager.setLoopType('single');
                message.channel.send(new CustomRichEmbed({
                    title: `${guild_queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} queue looping for the first item`,
                }, message));
            } else if (['all', 'a'].includes(command_args[0])) {
                await guild_queue_manager.toggleLoop();
                await guild_queue_manager.setLoopType('multiple');
                message.channel.send(new CustomRichEmbed({
                    title: `${guild_queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} queue looping for the entire queue`,
                }, message));
            } else if (['shuffle', 's'].includes(command_args[0])) {
                await guild_queue_manager.toggleLoop();
                await guild_queue_manager.setLoopType('shuffle');
                message.channel.send(new CustomRichEmbed({
                    title: `${guild_queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} queue shuffle looping for the entire queue`,
                }, message));
            } else {
                message.channel.send(new CustomRichEmbed({
                    title: 'Here are the possible loop commands',
                    description: `${'```'}\n${['i | item', 'a | all', 's | shuffle'].map(item => `${discord_command} [ ${item} ]`).join('\n')}\n${'```'}`,
                }, message));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh! What are you doing there mate!',
                description: [
                    'Nothing is playing right now!',
                    'This command can be used when I\'m playing something!'
                ].join('\n')
            }, message));
        }
    },
});
