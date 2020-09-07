'use strict';

const { disBotServers } = require('../SHARED_VARIABLES.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Plays a stream in a voice_connection
 * @param {VoiceConnection} voice_connection A discord.js VoiceState.VoiceConnection
 * @param {*} stream A recognizable stream by discord.js
 * @param {Number} volume_ratio A ratio to be used when setting the volume of a stream
 * @param {Function} startCallback A callback to fire after the stream has started playing
 * @param {Function} endCallback A callback to fire after the stream has finished playing
 * @param {Function} errorCallback A callback to fire when an error with the stream has occurred
 * @returns {Dispatcher} the `server.dispatcher` attached to the stream
 */
function playStream(voice_connection, stream, volume_ratio=1.0, startCallback=(voice_connection, dispatcher)=>{}, endCallback=(voice_connection, dispatcher)=>{}, errorCallback=(error)=>{}) {
    const server = disBotServers[voice_connection.channel.guild.id];

    if (typeof stream?.on === 'function') {
        stream.on('error', (error) => {
            console.trace(error);
            errorCallback(error);
        });
    }

    const magic_volume_constant = 0.275; // This number effects all volume situations
    server.dispatcher = voice_connection.play(stream, {
        type: 'unknown',
        seek: 0,
        volume: (magic_volume_constant * volume_ratio),
        highWaterMark: 1,
        fec: true,
    });

    server.dispatcher.on('start', () => {
        server.volume_manager.setVolume(server.volume_manager.volume);
        startCallback(voice_connection, server.dispatcher);
    });
    server.dispatcher.on('finish', () => {
        endCallback(voice_connection, server.dispatcher);
    });
    server.dispatcher.on('error', (error) => {
        console.trace(error);
        errorCallback(error);
    });

    return server.dispatcher;
}

module.exports = {
    playStream,
};
