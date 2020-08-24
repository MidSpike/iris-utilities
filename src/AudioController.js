'use strict';

const { getReadableTime } = require('../utilities.js');

const { disBotServers } = require('./SHARED_VARIABLES.js');

//---------------------------------------------------------------------------------------------------------------//

class AudioController {
    #guild;
    constructor(guild) {
        this.#guild = guild;
    }
    get voice() {
        return this.#guild.voice;
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
        disBotServers[this.#guild.id].queue_manager.clearItems(true);
        this.voice?.channel?.leave();
        return this;
    }
}

module.exports = {
    AudioController,
};
