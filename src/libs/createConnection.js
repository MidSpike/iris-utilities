'use strict';

const { Timer } = require('../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates a VoiceConnection to a VoiceChannel
 * @param {VoiceChannel} voice_channel A discord.js voice channel to join
 * @param {Boolean} force_new whether or not to disconnect the bot from the voice channel before making the new connection
 * @returns {Promise<VoiceConnection|undefined>} a Promise containing a Discord.VoiceConnection
 */
async function createConnection(voice_channel, force_new = false) {
    if (!voice_channel) throw new Error(`voice_channel is not defined!`);

    let voice_connection;

    const guild = voice_channel.guild;

    const guild_audio_controller = guild.client.$.audio_controllers.get(guild.id);
    const guild_queue_manager = guild.client.$.queue_managers.get(guild.id);

    const current_voice_state = guild.voice;
    if (current_voice_state?.connection && current_voice_state?.channel?.id === voice_channel.id && !force_new) {
        /* use the current voice_connection */
        voice_connection = current_voice_state.connection;
    } else {
        /* create a new voice_connection */
        if (force_new) guild_audio_controller.disconnect();
        await Timer(force_new ? 500 : 0); // wait a bit when force creating a new voice_connection

        guild_queue_manager.toggleLoop(false);
        guild_queue_manager.toggleAutoplay(false);
        guild_queue_manager.clearItems(true);

        try {
            if (voice_channel.joinable) {
                voice_connection = await voice_channel.join();
            } else {
                throw new Error('`voice_channel.joinable` is false!');
            }
        } catch {
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
