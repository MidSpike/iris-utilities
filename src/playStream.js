'use strict';

const { disBotServers } = require('./sharedVariables.js');

//---------------------------------------------------------------------------------------------------------------//

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
