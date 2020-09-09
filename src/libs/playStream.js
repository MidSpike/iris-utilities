'use strict';

const { disBotServers } = require('../SHARED_VARIABLES.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Plays a stream in a voice_connection
 * @param {VoiceConnection} voice_connection A discord.js VoiceState.VoiceConnection
 * @param {*} stream A recognizable stream by discord.js
 * @param {Number} volume_ratio A ratio to be used when setting the volume of a stream
 * @param {Function} start_callback this callback will fire after the stream has started playing
 * @param {Function} end_callback this callback will fire after the stream has finished playing
 * @param {Function} error_callback this callback will fire when an error with the stream has occurred
 * @returns {Dispatcher} the `server.dispatcher` attached to the stream
 */
function playStream(voice_connection, stream, volume_ratio=1.0, start_callback=(voice_connection, dispatcher)=>{}, end_callback=(voice_connection, dispatcher)=>{}, error_callback=(error)=>{}) {
    const server = disBotServers[voice_connection.channel.guild.id];

    if (typeof stream?.on === 'function') {
        stream.on('error', (error) => {
            console.trace(error);
            errorCallback(error);
        });
    }

    const magic_volume_constant = 0.275; // this number effects all volume situations

    server.dispatcher = voice_connection.play(stream, {
        type: 'unknown',
        seek: 0,
        volume: (magic_volume_constant * volume_ratio),
        highWaterMark: 1,
        fec: true,
    });

    server.dispatcher.on('start', () => {
        server.volume_manager.setVolume(server.volume_manager.volume);
        start_callback(voice_connection, server.dispatcher);
    });

    server.dispatcher.on('finish', () => {
        end_callback(voice_connection, server.dispatcher);
    });

    server.dispatcher.on('error', (error) => {
        console.trace(error);
        error_callback(error);
    });

    return server.dispatcher;
}

module.exports = {
    playStream,
};
