'use strict';

//#region local dependencies
const { disBotServers } = require('../../SHARED_VARIABLES.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { sendNotAllowedCommand } = require('../../libs/messages.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { isSuperPerson, isSuperPersonAllowed } = require('../../libs/permissions.js');
//#endregion local dependencies

module.exports = new DisBotCommand({
    name:'SUPERVOLUME',
    category:`${DisBotCommander.categories.SUPER_PEOPLE}`,
    description:'super volume',
    aliases:['supervolume', 'sv'],
    access_level:DisBotCommand.access_levels.BOT_SUPER,
    async executor(Discord, client, message, opts={}) {
        const { command_args } = opts;
        if (!isSuperPersonAllowed(isSuperPerson(message.member.id), 'super_volume')) {
            sendNotAllowedCommand(message);
            return;
        }
        const server = disBotServers[message.guild.id];
        const bot_voice_channels = client.voice.connections.map(voice_connection => voice_connection.channel);
        const user_voice_channel = message.member.voice.channel;
        if (!bot_voice_channels.includes(user_voice_channel)) return; // The user is not in a voice channel with the bot
        const super_volume_input = command_args.join(' ');
        const parsed_super_volume_input = parseFloat(super_volume_input);
        if (isNaN(parsed_super_volume_input)) { // Not a valid super volume
            message.channel.send(new CustomRichEmbed({
                title:`\`${parsed_super_volume_input}\` is not a valid super volume!`
            }, message));
            return;
        }
        server.dispatcher.setVolume(parsed_super_volume_input);
        message.channel.send(new CustomRichEmbed({
            title:`Super Volume: ${parsed_super_volume_input}`
        }, message));
    },
});
