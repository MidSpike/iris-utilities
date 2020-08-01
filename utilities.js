const bot_config = require('./config.json');

//---------------------------------------------------------------------------------------------------------------//

const youtubeSearch = require('youtube-search');

//---------------------------------------------------------------------------------------------------------------//

const { Discord, client } = require('./bot.js');

//---------------------------------------------------------------------------------------------------------------//

let restarting_bot = false;
let lockdown_mode = false;

//---------------------------------------------------------------------------------------------------------------//

/**
 * asynchronous setTimeout b/c I'm too lazy to type it out everywhere
 * @param {Number} time_in_milliseconds 
 * @returns {Promise}
 */
function Timer(time_in_milliseconds) {
    return new Promise((resolve, reject) => setTimeout(resolve, time_in_milliseconds));
}

/**
 * Forces a promise to resolve in a specified amount of time with an optional fallback return value
 * @param {Promise} promise_to_race 
 * @param {Number} time_in_milliseconds 
 * @param {*} fallback_return_value 
 * @returns {Promise|undefined} forced promise return or a fallback value
 */
async function forcePromise(promise_to_race, time_in_milliseconds=5000, fallback_return_value=undefined) {
    const forcedOutput = await Promise.race([promise_to_race, Timer(time_in_milliseconds)]);
    return forcedOutput ?? fallback_return_value;
}

/**
 * Generators "Unique" ids based off of the system time and a salt
 * @param {Number} salt_size 
 * @returns {String}
 */
function pseudoUniqueId(salt_size=5) {
    return `${Date.now()}${Math.floor((1 * 10 ** salt_size) + Math.random() * (9 * 10 ** salt_size))}`;
}

/**
 * Clamps a number: min <= num <= max
 * @param {*} num
 * @param {*} min
 * @param {*} max
 * @returns {Number}
 */
function math_clamp(num, min, max) {
    return Math.min(max, Math.max(min, num));
}

/**
 * Generates a random integer in an inclusive range: min <= return_value <= max
 * @param {*} min 
 * @param {*} max 
 * @returns {Number}
 */
function random_range_inclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates an array of specified size and fill_value to fill holes
 * @param {*} size 
 * @param {*} fill_value 
 * @returns {Array<undefined>|Array<*>}
 */
function array_make(size, fill_value=undefined) {
    return Array(size).fill(fill_value);
}

/**
 * Grabs a random item from an array
 * @param {Array<*>} array_of_things 
 * @returns {*}
 */
function array_random(array_of_things) {
    return array_of_things[random_range_inclusive(0, array_of_things.length - 1)];
}

/**
 * Inserts an item into an array at a specified index
 * @param {Array<*>} array_of_things 
 * @param {Number} insertion_index 
 * @param {*} item_to_be_inserted 
 * @returns {Array<*>}
 */
function array_insert(array_of_things, insertion_index, item_to_be_inserted) {
    return [...array_of_things.slice(0, insertion_index), item_to_be_inserted, ...array_of_things.slice(insertion_index)];
}

/**
 * Shuffles the items in an array and returns the array
 * @param {Array<*>} array_to_shuffle 
 * @returns {Array<*>}
 */
function array_shuffle(array_to_shuffle) {
    for (let i = array_to_shuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array_to_shuffle[i], array_to_shuffle[j]] = [array_to_shuffle[j], array_to_shuffle[i]];
    }
    return array_to_shuffle;
}

/**
 * Splits a large array into an array of chunks
 * @param {Array<*>} array_of_things 
 * @param {Number} chunk_size 
 * @returns {Array<Array<*>>}
 */
function array_chunks(array_of_things, chunk_size) {
    let chunks = [];
    while (array_of_things.length) {
        chunks.push(array_of_things.splice(0, chunk_size));
    }
    return chunks;
}

/**
 * Sorts an object based on it's keys (using Array.sort()) and returns the new sorted object
 * @param {Object} object_of_things 
 * @returns {Object}
 */
function object_sort(object_of_things) {
    return Object.keys(object_of_things).sort().reduce((r, k) => (r[k] = object_of_things[k], r), {});
}

/**
 * Converts seconds into a human readable format: HH:MM:SS
 * @param {Number} seconds 
 * @returns {String} HH:MM:SS
 */
function getReadableTime(seconds) {
    if (isNaN(seconds)) throw new Error('`seconds` was not a Number!');
    return [(seconds / 3600), (seconds % 3600 / 60), (seconds % 60)].map(t => `0${Math.floor(t)}`).join(':').replace(/(0(?=\d{2,}))+/g, '');
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Searches YouTube using the YT API and returns an array of search results
 * @param {String} search_query video, url, etc to look up on youtube
 * @param {Number} max_results 
 * @param {Number} allowed_retry_attempts 
 * @returns {Array<Object>|undefined}
 */
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

/**
 * Searches for an emoji located in the Bot's Emoji Server
 * @param {String} custom_emoji_name 
 * @returns {GuildEmoji|undefined}
 */
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
    pseudoUniqueId,
    math_clamp,
    random_range_inclusive,
    array_make,
    array_random,
    array_insert,
    array_shuffle,
    array_chunks,
    object_sort,
    getReadableTime,

    forceYouTubeSearch,

    findCustomEmoji,
};
