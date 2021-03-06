'use strict';

//#region dependencies
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendVolumeControllerEmbed } = require('../../libs/messages.js');
//#endregion dependencies

module.exports = new DisBotCommand({
    name: 'VOLUME',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 4,
    description: 'Allows the user to control the volume of audio playback',
    aliases: ['volume', 'v'],
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        
        const guild_dispatcher = client.$.dispatchers.get(message.guild.id);
        const guild_volume_manager = client.$.volume_managers.get(message.guild.id);

        if (!guild_dispatcher) { // There isn't anything to request the volume from
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Nothing is playing right now!',
                description: 'You can\'t change the volume in conditions like this!',
            }, message));
            return;
        }

        // see if the bot has an active voice connection shared with the user
        if (message.guild.me.voice.channelID === message.member.voice.channelID) {
            await guild_volume_manager.setVolume(parseFloat(command_args[0]) || guild_volume_manager.volume); // Don't use ?? here
            sendVolumeControllerEmbed(message.channel.id, message);
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Volume Controller Error',
                description: 'Get in a voice call with the bot before trying to change the volume!',
            }, message));
        }
    },
});
