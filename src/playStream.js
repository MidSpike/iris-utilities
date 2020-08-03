'use strict';

const { disBotServers } = require('./sharedVariables.js');

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
function playStream(voice_connection, stream, volume=undefined, startCallback=(voice_connection, dispatcher)=>{}, endCallback=(voice_connection, dispatcher)=>{}, errorCallback=(error)=>{}) {
    const server = disBotServers[voice_connection.channel.guild.id];

    const magic_volume_constant = 0.2;
    server.dispatcher = voice_connection.play(stream, {type:'unknown', seek:0, volume:magic_volume_constant, highWaterMark:1, fec:false});
    
    if (stream.on) {stream.on('error', (error) => errorCallback(error));}
    server.dispatcher.on('start', () => {
        server.volume_manager.setVolume(volume ?? server.volume_manager.volume);
        startCallback(voice_connection, server.dispatcher);
    });
    server.dispatcher.on('finish', () => {
        setTimeout(() => endCallback(voice_connection, server.dispatcher), 500);
    });
    server.dispatcher.on('error', (error) => {
        console.trace(error);
        errorCallback(error);
    });
}

module.exports = {
    playStream,
};
