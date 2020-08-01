const { Timer } = require('../utilities.js');
const { disBotServers } = require('./disBotServers.js');

//---------------------------------------------------------------------------------------------------------------//

async function createConnection(voice_channel, force_new=false) {
    if (!voice_channel) throw new Error(`voice_channel is not defined!`);
    if (voice_channel.guild.voice?.connection && !force_new) {// Return the current voice connection
        return voice_channel.guild.voice.connection;
    } else {// Create a new voice connection
        const server = disBotServers[voice_channel.guild.id];

        if (force_new) server.audio_controller.disconnect();
        await Timer(force_new ? 500 : 0);

        server.queue_manager.toggleLoop(false);
        server.queue_manager.toggleAutoplay(false);
        server.queue_manager.clearItems(true);

        let voice_connection;
        try {
            voice_connection = await voice_channel.join();
        } catch (error) {
            console.trace(`Unable to join voice_channel:`, voice_channel);
            throw new Error(`Unable to create voice connection!\n${error}`);
        }
        return voice_connection;
    }
}

module.exports = {
    createConnection,
};
