'use strict';

const { Timer,
        isObject,
        array_insert,
        array_shuffle,
        random_range_inclusive } = require('../utilities.js');

const { createConnection } = require('./createConnection.js');
const { playStream } = require('./playStream.js');
const { GuildConfigManipulator } = require('./GuildConfig.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for controlling and interacting with the Queue of a Guild
 * @param {Guild} guild a `new Discord.Guild`
 * @returns {QueueManager} the `new QueueManager`
 */
class QueueManager {
    #guild; // for future usage
    #allowed_loop_types = ['single', 'multiple', 'shuffle'];
    #queue = [];
    #last_removed = undefined;
    #loop_enabled = false;
    #loop_type = 'single'; // can be any of this.#allowed_loop_types
    #autoplay_enabled = false;

    constructor(guild) {
        this.#guild = guild;
    }

    get guild() {
        return this.#guild;
    }

    get queue() {
        return this.#queue;
    }

    get last_removed() {
        return this.#last_removed;
    }

    get loop_enabled() {
        return this.#loop_enabled;
    }

    get loop_type() {
        return this.#loop_type;
    }

    get autoplay_enabled() {
        return this.#autoplay_enabled;
    }

    /**
     * Adds a QueueItem to the Queue
     * @param {QueueItem} item a QueueItem to be added to the queue
     * @param {Number} insertion_index a postion in the queue (starting at 1) for the item to be added to
     * @returns {Promise<QueueManager>} 
     */
    async addItem(item, insertion_index=this.queue.length+1) {
        if (!item) throw new Error('Item is undefined and cannot be added to the queue!');
        this.#queue = array_insert(this.queue, insertion_index-1, item);
        if (this.queue.length === 1 && this.queue[0].player) {
            this.queue[0].player();
        }
        return this;
    }

    /**
     * Removes an item from the Queue
     * @param {Number} removal_index a postion in the queue (starting at 1) for an item to be removed from
     * @returns {Promise<QueueManager>} 
     */
    async removeItem(removal_index=1) {
        this.#last_removed = this.queue[0] ?? this.last_removed;
        this.#queue.splice(removal_index - 1, 1);
        return this;
    }

    /**
     * Shuffles all items in the queue (apart from the first item)
     * @returns {Promise<QueueManager>} 
     */
    async shuffleItems() {
        this.#queue = [this.queue[0], ...(array_shuffle(this.queue.slice(1, this.queue.length)))];
        return this;
    }

    /**
     * Clears all items from the Queue
     * @param {Boolean} all whether or not to force clear all items in the queue (including the first one)
     * @returns {Promise<QueueManager>} 
     */
    async clearItems(all=false) {
        this.toggleLoop(false);
        this.toggleAutoplay(false);
        this.#last_removed = this.queue[0] ?? this.last_removed;
        this.#queue = all ? [] : (this.queue[0] ? [this.queue[0]] : []);
        return this;
    }

    /**
     * Toggles the Queue Loop feature
     * @param {Boolean} override force the Queue Loop to this value
     * @returns {Promise<QueueManager>} 
     */
    async toggleLoop(override=undefined) {
        this.#loop_enabled = override !== undefined ? override : !this.loop_enabled;
        return this;
    }

    /**
     * Sets the Queue Loop methodology
     * @param {String} new_loop_type (obtainable values can be found in `this.#allowed_loop_types`)
     * @returns {Promise<QueueManager>} 
     */
    async setLoopType(new_loop_type='single') {
        if (this.#allowed_loop_types.includes(new_loop_type)) {
            this.#loop_type = new_loop_type;
        } else {
            throw new Error('Invalid loop type was passed!');
        }
        return this;
    }

    /**
     * Toggles the Queue Autoplay feature
     * @param {Boolean} override force the Queue Autoplay to this value
     * @returns {Promise<QueueManager>} 
     */
    async toggleAutoplay(override=undefined) {
        this.#autoplay_enabled = override !== undefined ? override : !this.autoplay_enabled;
        return this;
    }
}

class QueueItem {
    static types = ['youtube', 'tts', 'mp3', 'other'];
    constructor(type, player, description, metadata={}) {
        if (!QueueItem.types.includes(type)) throw new TypeError('`type` should be a valid type from `QueueItem.types`');
        if (typeof player !== 'function') throw new TypeError('`player` should be an anonymous function created by `QueueItemPlayer`');
        if (typeof description !== 'string') throw new TypeError('`description` should be a string');
        if (!isObject(metadata)) throw new TypeError('`metadata` should be an object');
        this.type = type;
        this.player = player;
        this.description = description;
        this.metadata = metadata;
    }
}

class QueueItemPlayer {
    /**
     * Creates a player for queue items
     * @param {QueueManager} queue_manager 
     * @param {VoiceConnection} voice_connection 
     * @param {Function} stream_maker 
     * @param {Number} volume_ratio 
     * @param {Function} start_callback 
     * @param {Function} end_callback 
     * @param {Function} error_callback 
     * @returns {QueueItemPlayer} an instance of QueueItemPlayer
     */
    constructor(queue_manager, voice_connection, stream_maker, volume_ratio, start_callback, end_callback, error_callback) {
        if (queue_manager === undefined || voice_connection === undefined || stream_maker === undefined) {
            console.trace(`QueueItemPlayer is missing something:`, {queue_manager, voice_connection, stream_maker});
            return;
        }
        this.queue_manager = queue_manager;
        this.voice_connection = voice_connection;
        this.stream_maker =  async () => await stream_maker(); // for generating a new stream for each run of the queue item player
        this.volume_ratio = volume_ratio ?? undefined;
        this.start_callback = typeof start_callback === 'function' ? start_callback : (() => {});
        this.end_callback = typeof end_callback === 'function' ? end_callback : (() => {});
        this.error_callback = typeof error_callback === 'function' ? error_callback : ((error) => {});
        return async () => {
            const guild = this.queue_manager.guild;
            const guild_config_manipulator = new GuildConfigManipulator(guild.id);
            const guild_config = guild_config_manipulator.config;
            const guild_tts_provider = guild_config.tts_provider;
            const guild_tts_voice = guild_tts_provider === 'ibm' ? guild_config.tts_voice_ibm : guild_config.tts_voice_google;

            const guild_audio_controller = guild.client.$.audio_controllers.get(guild.id);

            playStream(await createConnection(this.voice_connection.channel), await this.stream_maker(), this.volume_ratio, async () => {
                await this.start_callback();
            }, async (voice_connection, dispatcher) => {
                await this.queue_manager.removeItem(1); // remove this item from the queue
                await this.end_callback();

                const queue_is_active = () => this.queue_manager.queue.length > 0 || this.queue_manager.loop_enabled || this.queue_manager.autoplay_enabled;
                if (!queue_is_active()) { // the bot is not active in vc, so run the disconnect process
                    await Timer(1000 * 10); // wait 10 seconds before starting the disconnect process

                    const bot_is_active_in_vc = () => voice_connection.voice?.speaking === true;

                    /* loop 20 times at an interval of 1 second (total check time of 20 seconds) to see if vc is active */
                    for (let vc_check_number = 0; vc_check_number < 20; vc_check_number++) {
                        if (queue_is_active() || bot_is_active_in_vc()) return;
                        await Timer(1000);
                    }

                    if (guild_config.disconnect_tts_voice === 'enabled') { // disconnect with TTS
                        const tts_text = `Disconnecting...`;
                        const tts_url_stream = `${process.env.BOT_API_SERVER_URL}/speech?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&type=${encodeURIComponent(guild_tts_provider)}&lang=${encodeURIComponent(guild_tts_voice)}&text=${encodeURIComponent(tts_text)}`;
                        playStream(voice_connection, tts_url_stream, 15.0, undefined, () => {
                            guild_audio_controller.disconnect();
                        });
                    } else { // disconnect without TTS
                        guild_audio_controller.disconnect();
                    }
                } else { // the queue is not empty so handle it
                    if (this.queue_manager.loop_enabled) { // queue loop is enabled
                        if (this.queue_manager.loop_type === 'multiple') {
                            this.queue_manager.addItem(this.queue_manager.last_removed); // add the last removed item to the end of the queue
                        } else if (this.queue_manager.loop_type === 'shuffle') {
                            const random_queue_insertion = random_range_inclusive(1, this.queue_manager.queue.length);
                            this.queue_manager.addItem(this.queue_manager.last_removed, random_queue_insertion); // add the last removed item as a shuffled item to play
                        } else if (this.queue_manager.loop_type === 'single') {
                            this.queue_manager.addItem(this.queue_manager.last_removed, 1); // add the last removed item as the next item to play
                        }
                    }
                    if (this.queue_manager.queue.length > 0) { // the queue is not empty so continue playing
                        if (guild_config.queue_tts_voice === 'enabled') {
                            const tts_text = `Next Up: ${this.queue_manager.queue[0].description}`;
                            const tts_url_stream = `${process.env.BOT_API_SERVER_URL}/speech?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&type=${encodeURIComponent(guild_tts_provider)}&lang=${encodeURIComponent(guild_tts_voice)}&text=${encodeURIComponent(tts_text)}`;
                            playStream(voice_connection, tts_url_stream, 15.0, undefined, () => {
                                this.queue_manager.queue[0].player();
                            });
                        } else {
                            this.queue_manager.queue[0].player();
                        }
                    }
                }
            }, (error) => {
                this.error_callback(error);
            });
        };
    }
}

module.exports = {
    QueueManager,
    QueueItem,
    QueueItemPlayer
};
