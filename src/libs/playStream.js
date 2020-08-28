'use strict';

const { disBotServers } = require('../SHARED_VARIABLES.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * 
 * @param {VoiceConnection} voice_connection A discord.js VoiceState.VoiceConnection
 * @param {*} stream A recognizable stream by discord.js
 * @param {Number} volume A number to be passed as the set volume for the item to be played
 * @param {Function} startCallback A callback to fire after the stream has started playing
 * @param {Function} endCallback A callback to fire after the stream has finished playing
 * @param {Function} errorCallback A callback to fire when an error with the stream has occurred
 */
function playStream(voice_connection, stream, volume_ratio=1.0, startCallback=(voice_connection, dispatcher)=>{}, endCallback=(voice_connection, dispatcher)=>{}, errorCallback=(error)=>{}) {
    const server = disBotServers[voice_connection.channel.guild.id];
    
    if (stream.on) {
        stream.on('error', (error) => {
            console.trace(error);
            errorCallback(error);
        });
    }
    
    const magic_volume_constant = 0.275; // This number effects all volume situations
    server.dispatcher = voice_connection.play(stream, {type:'unknown', seek:0, volume:(magic_volume_constant * volume_ratio), highWaterMark:1, fec:true});
    
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
}

module.exports = {
    playStream,
};
