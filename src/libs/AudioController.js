'use strict';

const { getReadableTime } = require('../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

class AudioController {
    #guild;

    constructor(guild) {
        this.#guild = guild;
    }

    get guild() {
        return this.#guild;
    }

    get voice() {
        return this.guild.me.voice;
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
        const guild_queue_manager = this.guild.client.$.queue_managers.get(this.guild.id);
        guild_queue_manager.clearItems(true);
        this.voice?.channel?.leave();
        return this;
    }
}

module.exports = {
    AudioController,
};
