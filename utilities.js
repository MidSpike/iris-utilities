const bot_config = require('./config.json');

//---------------------------------------------------------------------------------------------------------------//

const fs = require('fs');
const youtubeSearch = require('youtube-search');

//---------------------------------------------------------------------------------------------------------------//

const { Discord, client } = require('./bot.js');

//---------------------------------------------------------------------------------------------------------------//

let restarting_bot = false;
let lockdown_mode = false;

//---------------------------------------------------------------------------------------------------------------//

const Timer = (time_in_ms) => new Promise((resolve, reject) => setTimeout(resolve, time_in_ms));

async function forcePromise(promise_to_race, time_in_ms=5000, fallback_return_value=undefined) {
    const forcedOutput = await Promise.race([promise_to_race, Timer(time_in_ms)]);
    return forcedOutput ?? fallback_return_value;
}

function uniqueId(salt_size=5) {
    return `${Date.now()}${Math.floor((1 * 10 ** salt_size) + Math.random() * (9 * 10 ** salt_size))}`;
}

function forceInt(unsafe_int_str='0', fallback_int=0) {
    const lazy_int_conversion = parseInt(unsafe_int_str);
    return typeof lazy_int_conversion !== 'number' || isNaN(lazy_int_conversion) ? fallback_int : lazy_int_conversion;
}

function forceFloat(unsafe_float_str='0', fallback_float=0.0) {
    const lazy_float_conversion = parseFloat(unsafe_float_str);
    return typeof lazy_float_conversion !== 'number' || isNaN(lazy_float_conversion) ? fallback_float : lazy_float_conversion;
}

function math_clamp(num, lower, upper) {
    return Math.min(upper, Math.max(lower, num));
}

//---------------------------------------------------------------------------------------------------------------//

const random_range_inclusive = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const array_make = (size, value=undefined) => Array(size).fill(value);
const array_random = (array) => array[random_range_inclusive(0, array.length - 1)];
const array_insert = (array, index, newItem) => [...array.slice(0, index), newItem, ...array.slice(index)];
const array_shuffle = (temp_array) => {
    for (let i = temp_array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [temp_array[i], temp_array[j]] = [temp_array[j], temp_array[i]];
    }
    return temp_array;
};
const array_chunks = (array, chunk_size) => {
    let chunks = [];
    while (array.length) {
        chunks.push(array.splice(0, chunk_size));
    }
    return chunks;
};

const object_sort = (o) => Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {});

const getReadableTime = (seconds) => [(seconds / 3600), (seconds % 3600 / 60), (seconds % 60)].map(t => `0${Math.floor(t)}`).join(':').replace(/(0(?=\d{2,}))+/g, '');

//---------------------------------------------------------------------------------------------------------------//

function getDiscordCommand(message) {
    return message.content.split(/\s/g).filter(item => item !== '')[0].toLowerCase();
}
function getDiscordCommandArgs(message) {
    return message.content.split(/\s/g).filter(item => item !== '').slice(1);
}
function getDiscordCleanCommandArgs(message) {
    return message.cleanContent.split(/\s/g).filter(item => item !== '').slice(1);
}

//---------------------------------------------------------------------------------------------------------------//

class DisBotCommand {
    constructor(name='', aliases=[], executor=(client, message, opts={})=>{}) {
        if (typeof name !== 'string' || name.length === 0) throw new Error('`name` must be a valid string!');
        if (!Array.isArray(aliases) || aliases.length === 0) throw new Error('`desciption` must be a valid array!');
        if (typeof executor !== 'function') throw new Error('`executor` must be a valid executor function!');
        this.name = name;
        this.aliases = aliases;
        this.executor = executor;
        return this;
    }
    execute(client, message, opts={}) {
        return this.executor(client, message, opts);
    }
}

class DisBotCommander {
    static #commands = [];
    static get commands() {
        return this.#commands;
    }
    static registerCommand(command) {
        if (command instanceof DisBotCommand) {
            this.#commands.push(command);
        } else {
            throw new TypeError(`'command' should be an instance of the DisBotCommand type!`);
        }
    }
}

//---------------------------------------------------------------------------------------------------------------//

class CustomRichEmbed {
    constructor(options={}, message=undefined) {
        this.color = options.color ?? 0xFF5500;
        this.author = message ? (options.author !== undefined ? options.author : {iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag}`}) : (options.author ?? null);
        this.title = options.title ?? null;
        this.description = options.description ?? null;
        this.fields = options.fields ?? null;
        this.image = options.image ? {url:options.image} : null;
        this.thumbnail = options.thumbnail ? {url:options.thumbnail} : null;
        this.footer = message ? (options.footer !== undefined ? options.footer : {iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${message.cleanContent}`}) : (options.footer ?? null);
        return new Discord.MessageEmbed({...this});
    }
}

//---------------------------------------------------------------------------------------------------------------//

const disBotServers = {/*
    'guild_id':{
        queue_manager,
        volume_manager,
        audio_controller,
        dispatcher,
    }
*/};

//---------------------------------------------------------------------------------------------------------------//

class QueueManager {
    constructor() {
        this._queue = [];
        this._last_removed = undefined;
        this._loop_enabled = false;
        this._loop_type = 'single'; // Can be [ single | multiple | shuffle ]
        this._autoplay_enabled = false;
    }
    get queue() {
        return this._queue;
    }
    get last_removed() {
        return this._last_removed;
    }
    get loop_enabled() {
        return this._loop_enabled;
    }
    get loop_type() {
        return this._loop_type;
    }
    get autoplay_enabled() {
        return this._autoplay_enabled;
    }
    async addItem(item, insert_index=this.queue.length+1) {
        if (item) {// Don't Allow falsey items into queue
            this._queue = array_insert(this._queue, insert_index-1, item);
        }
        if (this.queue.length === 1 && this.queue[0].player) {
            this._queue[0].player();
        }
        return this;
    }
    async removeItem(item_index=1) {
        this._last_removed = this._queue[0] ?? this.last_removed;
        this._queue.splice(item_index - 1, 1);
        return this;
    }
    async shuffleItems() {
        this._queue = [this.queue[0], ...(array_shuffle(this._queue.slice(1, this._queue.length)))];
        return this;
    }
    async clearItems(all=false) {
        this.toggleLoop(false);
        this.toggleAutoplay(false);
        this._last_removed = this._queue[0] ?? this.last_removed;
        this._queue = all ? [] : (this.queue[0] ? [this.queue[0]] : []);
        return this;
    }
    async toggleLoop(override=undefined) {
        this._loop_enabled = override !== undefined ? override : !this.loop_enabled;
        return this;
    }
    async setLoopType(new_loop_type) {
        this._loop_type = new_loop_type;
        return this;
    }
    async toggleAutoplay(override=undefined) {
        this._autoplay_enabled = override !== undefined ? override : !this.autoplay_enabled;
        return this;
    }
}

class QueueItem {
    constructor(type, player, description, metadata={}) {
        this.type = ['youtube', 'tts', 'mp3', 'other'].includes(type) ? type : 'other';
        this.player = player; // Player should be a QueueItemPlayer
        this.description = description;
        this.metadata = metadata;
    }
}

class QueueItemPlayer {
    constructor(queue_manager, voice_connection, stream_maker, volume, start_callback, end_callback, error_callback) {
        if (queue_manager === undefined || voice_connection === undefined || stream_maker === undefined) {
            console.trace(`QueueItemPlayer is missing something:`, {queue_manager, voice_connection, streamMaker});
            return;
        }
        this.queue_manager = queue_manager;
        this.voice_connection = voice_connection;
        this.stream_maker =  async () => await stream_maker(); // Generates a new stream for each run of the player
        this.volume = volume ?? undefined;
        this.start_callback = typeof start_callback === 'function' ? start_callback : (() => {});
        this.end_callback = typeof end_callback === 'function' ? end_callback : (() => {});
        this.error_callback = typeof error_callback === 'function' ? error_callback : (() => {});
        return async () => {
            const server = disBotServers[this.voice_connection.channel.guild.id];
            playStream(await createConnection(this.voice_connection.channel), await this.stream_maker(), this.volume, () => {
                this.start_callback();
            }, async (voice_connection, dispatcher) => {
                await this.queue_manager.removeItem(1);
                this.end_callback();
                if (this.queue_manager.queue.length === 0 && voice_connection && !this.queue_manager.loop_enabled) {// The queue is empty so disconnect the bot
                    client.setTimeout(() => {
                        if (this.queue_manager.queue.length === 0 && voice_connection && (!this.queue_manager.loop_enabled || !this.queue_manager.autoplay_enabled)) {
                            server.audio_controller.disconnect();
                        }
                    }, 30000);
                } else {// The queue is not empty so handle it
                    if (this.queue_manager.loop_enabled) {// The queue loop is enabled
                        if (this.queue_manager.loop_type === 'multiple') {
                            this.queue_manager.addItem(this.queue_manager.last_removed); // Add the last removed item to the end of the queue
                        } else if (this.queue_manager.loop_type === 'shuffle') {
                            const random_queue_insertion = random_range_inclusive(1, this.queue_manager.queue.length);
                            this.queue_manager.addItem(this.queue_manager.last_removed, random_queue_insertion); // Add the last removed item as a shuffled item to play
                        } else if (this.queue_manager.loop_type === 'single') {
                            this.queue_manager.addItem(this.queue_manager.last_removed, 1); // Add the last removed item as the next item to play
                        }
                    }
                    if (this.queue_manager.queue.length > 0) {// The queue is not empty so continue playing
                        this.queue_manager.queue[0].player();
                    }
                }
            }, (error) => {
                this.error_callback(error);
            });
        };
    }
}

//---------------------------------------------------------------------------------------------------------------//

class AudioController {
    constructor(guild) {
        this._guild = guild;
    }
    get voice() {
        return this._guild.voice;
    }
    get timestamp() {
        if (!this.voice?.connection?.dispatcher) return;
        return getReadableTime(Math.trunc(this.voice.connection.dispatcher.streamTime / 1000));
    }
    get paused() {
        if (!this.voice?.connection?.dispatcher) return;
        return this.voice.connection.dispatcher.paused ? true : false;
    }
    async pause() {
        if (!this.voice?.connection?.dispatcher) return;
        this.voice.connection.dispatcher.pause();
        return this;
    }
    async resume() {
        if (!this.voice?.connection?.dispatcher) return;
        this.voice.connection.dispatcher.resume();
        return this;
    }
    async skip() {
        if (!this.voice?.connection?.dispatcher) return;
        this.voice.connection.dispatcher.end();
        return this;
    }
    async disconnect() {
        if (!this.voice?.channel) return;
        disBotServers[this._guild.id].queue_manager.clearItems(true);
        this.voice.channel.leave();
        return this;
    }
}

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
            throw new Error(`Unable to create voice connection!\n${error}`);
        }
        return voice_connection;
    }
}

function playStream(voice_connection, stream, volume=undefined, startCallback=(voice_connection, dispatcher)=>{}, endCallback=(voice_connection, dispatcher)=>{}, errorCallback=(error)=>{}) {
    const server = disBotServers[voice_connection.channel.guild.id];

    server.dispatcher = voice_connection.play(stream, {type:'unknown', seek:0, volume:100 * server.volume_manager.multiplier, highWaterMark:1, fec:false});
    server.volume_manager.setVolume(volume ?? server.volume_manager.volume); // You MUST set the volume AFTER telling it to play... to prevent weirdness.

    if (stream.on) {stream.on('error', (error) => errorCallback(error));}
    server.dispatcher.on('start', () => startCallback(voice_connection, server.dispatcher));
    server.dispatcher.on('finish', () => {
        client.setTimeout(() => endCallback(voice_connection, server.dispatcher), 500);
    });
    server.dispatcher.on('error', (error) => {
        console.trace(error);
        errorCallback(error);
    });
}

//---------------------------------------------------------------------------------------------------------------//

async function forceYouTubeSearch(search_query='', max_results=5, allowed_retry_attempts=3) {
    let current_search_attempt = 1;
    let search_results;
    while (current_search_attempt <= allowed_retry_attempts) {
        try {
            search_results = (await youtubeSearch(search_query, {maxResults:max_results, type:'video', regionCode:'US', key:process.env.YOUTUBE_API_TOKEN}))?.results;
        } catch (error) {
            throw error;
        } finally {
            if (search_results?.length > 0) break;
            else current_search_attempt++;
            await Timer(1000 + current_search_attempt * 250);
        }
    }
    return search_results ?? undefined;
}

//---------------------------------------------------------------------------------------------------------------//

function findCustomEmoji(custom_emoji_name) {
    const bot_custom_emojis = client.guilds.cache.get(bot_config.emoji_guild_id).emojis.cache;
    return bot_custom_emojis.find(emoji => emoji.name === custom_emoji_name) ?? undefined;
}

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    restarting_bot,
    lockdown_mode,

    Timer,
    forcePromise,
    uniqueId,
    forceInt,
    forceFloat,
    math_clamp,

    random_range_inclusive,
    array_make,
    array_random,
    array_insert,
    array_shuffle,
    array_chunks,
    object_sort,
    getReadableTime,

    getDiscordCommand,
    getDiscordCommandArgs,
    getDiscordCleanCommandArgs,

    disBotServers,

    DisBotCommander,
    DisBotCommand,

    CustomRichEmbed,

    QueueManager,
    QueueItem,
    QueueItemPlayer,

    AudioController,

    createConnection,
    playStream,

    forceYouTubeSearch,

    findCustomEmoji,
};