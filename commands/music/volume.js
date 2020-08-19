'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../src/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../src/DisBotCommander.js');
const { disBotServers } = require('../../src/SHARED_VARIABLES.js');
const { sendVolumeControllerEmbed } = require('../../src/messages.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'VOLUME',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:4,
    description:'Enables the user to control the volume of the audio playback',
    aliases:['volume', 'v'],
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        const server = disBotServers[message.guild.id];
        if (!server.dispatcher) { // There isn't anything to request the volume from
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Nothing Is Playing Right Now!',
                description:`You can't change the volume in conditions like this!`,
            }, message));
            return;
        }
        // See if the bot has an active voice connection shared with the user
        if (message.guild.voice?.connection?.channel?.id === message.member.voice?.channel?.id) {
            server.volume_manager.setVolume(parseFloat(command_args[0]) || server.volume_manager.volume); // Don't use ?? here
            sendVolumeControllerEmbed(message.channel.id, message);
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Volume Controller Error',
                description:'Get in a voice call with the bot!'
            }, message));
        }
    },
});
