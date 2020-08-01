const { disBotServers } = require('./disBotServers.js');
const { getReadableTime } = require('../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

class AudioController {
    constructor(guild) {
        this._guild = guild;
    }
    get voice() {
        return this._guild.voice;
    }
    get timestamp() {
        const dispatcher_stream_time = this.voice?.connection?.dispatcher?.streamTime;
        return dispatcher_stream_time ? getReadableTime(Math.trunc(dispatcher_stream_time / 1000)) : undefined;
    }
    get paused() {
        return this.voice?.connection?.dispatcher?.paused;
    }
    async pause() {
        this.voice?.connection?.dispatcher?.pause();
        return this;
    }
    async resume() {
        this.voice?.connection?.dispatcher?.resume();
        return this;
    }
    async skip() {
        this.voice?.connection?.dispatcher?.end();
        return this;
    }
    async disconnect() {
        disBotServers[this._guild.id].queue_manager.clearItems(true);
        this.voice?.channel?.leave();
        return this;
    }
}

module.exports = {
    AudioController,
};
