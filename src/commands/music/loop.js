'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'LOOP',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 10,
    description: 'Loops items in the queue',
    aliases: ['loop', 'l'],
    async executor(Discord, client, message, opts={}) {
        const { discord_command, command_args } = opts;

        if (!message.guild.me.voice.connection) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Uh Oh! What are you doing there mate!',
                    description: 'I\'m not in a voice channel!',
                }, message),
            }).catch(console.warn);
            return;
        }

        if (message.member.voice.channelID !== message.guild.me.voice.channelID) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Uh Oh! What are you doing there mate!',
                    description: 'You aren\'t in my voice channel!',
                }, message),
            }).catch(console.warn);
            return;
        }

        const guild_queue_manager = client.$.queue_managers.get(message.guild.id);

        if (guild_queue_manager.queue.length === 0) {
            message.channel.send({
                embed: new CustomRichEmbed({
                    color: 0xFFFF00,
                    title: 'Uh Oh! What are you doing there mate!',
                    description: 'Nothing is playing right now!',
                }, message),
            }).catch(console.warn);
            return;
        }

        if (['item', 'i'].includes(command_args[0])) {
            await guild_queue_manager.toggleLoop();
            await guild_queue_manager.setLoopType('single');
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: `${guild_queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} queue looping for the first item`,
                }, message),
            }).catch(console.warn);
        } else if (['all', 'a'].includes(command_args[0])) {
            await guild_queue_manager.toggleLoop();
            await guild_queue_manager.setLoopType('multiple');
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: `${guild_queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} queue looping for the entire queue`,
                }, message),
            }).catch(console.warn);
        } else if (['shuffle', 's'].includes(command_args[0])) {
            await guild_queue_manager.toggleLoop();
            await guild_queue_manager.setLoopType('shuffle');
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: `${guild_queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} queue shuffle looping for the entire queue`,
                }, message),
            }).catch(console.warn);
        } else {
            message.channel.send({
                embed: new CustomRichEmbed({
                    title: 'Here are the possible loop commands',
                    description: `${'```'}\n${['i | item', 'a | all', 's | shuffle'].map(item => `${discord_command} [ ${item} ]`).join('\n')}\n${'```'}`,
                }, message),
            }).catch(console.warn);
        }
    },
});
