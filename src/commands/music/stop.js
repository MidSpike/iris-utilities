'use strict';

//#region local dependencies
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { DisBotCommander, DisBotCommand } = require('../../libs/DisBotCommander.js');
const { disBotServers } = require('../../SHARED_VARIABLES.js');
const { playStream } = require('../../libs/playStream.js')

const bot_config = require('../../../config.json');
//#endregion local dependencies

const bot_common_name = bot_config.common_name;

module.exports = new DisBotCommand({
    name:'STOP',
    category:`${DisBotCommander.categories.MUSIC}`,
    weight:7,
    description:'Stops music playback and disconnects the bot from the voice channel',
    aliases:['stop', 'bye', 'fuckoff', '#{cp}'],
    async executor(Discord, client, message, opts={}) {
        const { guild_config_manipulator } = opts;

        const server = disBotServers[message.guild.id];
        const guild_config = guild_config_manipulator.config;
        const guild_tts_provider = guild_config.tts_provider;
        const guild_tts_voice = guild_tts_provider === 'ibm' ? guild_config.tts_voice_ibm : guild_config.tts_voice_google;

        const voice_connection = server.audio_controller.voice?.connection;

        if (!voice_connection) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`You can't disconnect me!`,
                description:`I'm not even in a voice channel!`
            }, message));
            return;
        }

        if (voice_connection.channel.id !== message.member.voice.channel?.id) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`You can't disconnect me!`,
                description:`You aren't in my voice channel!`
            }, message));
            return;
        }

        message.channel.send(new CustomRichEmbed({
            title:`Controlling ${bot_common_name}`,
            description:`Told ${bot_common_name} to leave their voice channel.`
        }, message));

        if (guild_config.disconnect_tts_voice === 'enabled') { // play TTS before disconnecting
            const tts_url_stream = `${process.env.BOT_API_SERVER_URL}/speech?type=${encodeURIComponent(guild_tts_provider)}&lang=${encodeURIComponent(guild_tts_voice)}&text=${encodeURIComponent('disconnecting')}`;
            playStream(voice_connection, tts_url_stream, 10.0, undefined, () => {
                server.audio_controller.disconnect();
            });
        } else {
            server.audio_controller.disconnect();
        }
    },
});
