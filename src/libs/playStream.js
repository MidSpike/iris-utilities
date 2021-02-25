'use strict';

const { client } = require('./discord_client.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Plays a stream in a voice_connection
 * @param {VoiceConnection} voice_connection a discord.js VoiceState.VoiceConnection
 * @param {*} stream a recognizable stream by discord.js
 * @param {Number} volume_ratio a ratio to be used when setting the volume of a stream
 * @param {Function} start_callback this callback will fire after the stream has started playing
 * @param {Function} end_callback this callback will fire after the stream has finished playing
 * @param {Function} error_callback this callback will fire when an error with the stream has occurred
 * @returns {Dispatcher} the `guild_dispatcher` attached to the stream
 */
function playStream(voice_connection, stream, volume_ratio=1.0, start_callback=(voice_connection, dispatcher)=>{}, end_callback=(voice_connection, dispatcher)=>{}, error_callback=(error)=>{}) {
    if (!voice_connection) throw new Error(`expected a 'voice_connection'`);
    if (!stream) throw new Error(`expected a 'stream'`);

    const guild_volume_manager = client.$.volume_managers.get(voice_connection.channel.guild.id);

    if (typeof stream?.on === 'function') {
        stream.on('error', (error) => {
            console.trace(error);
            error_callback(error);
        });
    }

    const guild_dispatcher = voice_connection.play(stream, {
        type: 'unknown',
        seek: 0,
        volume: 0,
        highWaterMark: 1, // set to `1` for quick volume adjustments
        fec: true,
    });
    guild_dispatcher.$ = {
        volume_ratio: volume_ratio,
    };
    client.$.dispatchers.set(voice_connection.channel.guild.id, guild_dispatcher);

    guild_dispatcher.on('start', () => {
        guild_volume_manager.setVolume(guild_volume_manager.volume);
        start_callback(voice_connection, guild_dispatcher);
    });

    guild_dispatcher.on('finish', () => {
        end_callback(voice_connection, guild_dispatcher);
    });

    guild_dispatcher.on('error', (error) => {
        console.trace(error);
        error_callback(error);
    });

    guild_dispatcher.on('debug', (debug) => {
        console.info(`----------------------------------------------------------------------------------------------------------------`);
        console.info('guild_dispatcher#debug:', debug);
        console.info(`----------------------------------------------------------------------------------------------------------------`);
    });

    return guild_dispatcher;
}

module.exports = {
    playStream,
};
