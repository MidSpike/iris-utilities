'use strict';

//#region dependencies
const axios = require('axios');

const { COMMON_NAME: bot_common_name } = require('../../../config.js');

const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { playStream } = require('../../libs/playStream.js');
//#endregion dependencies

const bot_api_url = `${process.env.BOT_API_SERVER_URL}:${process.env.BOT_API_SERVER_PORT}`;

module.exports = new DisBotCommand({
    name: 'LEAVE',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 7,
    description: 'Stops music playback and disconnects the bot from the voice channel',
    aliases: ['leave', 'stop', 'bye', 'fuckoff', '#{cp}'],
    async executor(Discord, client, message, opts={}) {
        const guild_audio_controller = client.$.audio_controllers.get(message.guild.id);

        const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);
        const guild_tts_provider = guild_config.tts_provider;
        const guild_tts_voice = guild_tts_provider === 'ibm' ? guild_config.tts_voice_ibm : guild_config.tts_voice_google;

        const voice_connection = guild_audio_controller.voice?.connection;

        if (!voice_connection) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'You can\'t disconnect me!',
                description: 'I\'m not in a voice channel!',
            }, message));
            return;
        }

        if (voice_connection.channel.id !== message.member.voice.channel?.id) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'You can\'t disconnect me!',
                description: 'You aren\'t in my voice channel!',
            }, message));
            return;
        }

        message.channel.send(new CustomRichEmbed({
            title: `Controlling ${bot_common_name}`,
            description: `Told ${bot_common_name} to leave their voice channel.`,
        }, message));

        if (guild_config.disconnect_tts_voice === 'enabled') {
            /* play tts before disconnecting */
            const tts_url_stream = `${bot_api_url}/speech?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&type=${encodeURIComponent(guild_tts_provider)}&lang=${encodeURIComponent(guild_tts_voice)}&text=${encodeURIComponent('Disconnecting...')}`;
            const stream_maker = async () => {
                const { data: response_stream } = await axios({
                    method: 'get',
                    url: tts_url_stream,
                    responseType: 'stream',
                });
                return response_stream;
            };
            const stream = await stream_maker();
            playStream(voice_connection, stream, 15.0, undefined, () => {
                guild_audio_controller.disconnect();
            });
        } else {
            guild_audio_controller.disconnect();
        }
    },
});
