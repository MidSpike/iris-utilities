'use strict';

const { Timer } = require('../utilities.js');

const { disBotServers } = require('../SHARED_VARIABLES.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates a VoiceConnection to a VoiceChannel
 * @param {VoiceChannel} voice_channel A discord.js voice channel to join
 * @param {Boolean} force_new whether or not to disconnect the bot from the voice channel before making the new connection
 * @returns {Promise<VoiceConnection|undefined>} a Discord.VoiceConnection
 */
async function createConnection(voice_channel, force_new=false) {
    if (!voice_channel) throw new Error(`voice_channel is not defined!`);

    let voice_connection;

    const current_voice_state = voice_channel.guild.voice;
    if (current_voice_state?.connection && current_voice_state?.channel?.id === voice_channel.id && !force_new) {
        // use the current voice_connection
        voice_connection = current_voice_state.connection;
    } else {
        // create a new voice_connection
        const server = disBotServers[voice_channel.guild.id];

        if (force_new) server.audio_controller.disconnect();
        await Timer(force_new ? 500 : 0); // wait a bit when force creating a new voice_connection

        server.queue_manager.toggleLoop(false);
        server.queue_manager.toggleAutoplay(false);
        server.queue_manager.clearItems(true);

        try {
            /** @TODO @FIX prevent trying to join voice channels that aren't joinable */
            voice_connection = await voice_channel.join();
        } catch (error) {
            console.trace(error);
            throw new Error(`Unable to join the voice_channel (${voice_channel.id})`);
        }
    }

    /** @TODO */
    // voice_connection?.removeAllListeners('warn');
    // voice_connection?.on('warn', (warning) => {
    //     console.warn(`voice_connection warning for voice_channel (${voice_connection.channel.id})`, warning);
    // });
    // voice_connection?.removeAllListeners('error');
    // voice_connection?.on('error', (error) => {
    //     console.warn(`voice_connection error for voice_channel (${voice_connection.channel.id})`, error);
    // });

    return voice_connection ?? undefined;
}

module.exports = {
    createConnection,
};
