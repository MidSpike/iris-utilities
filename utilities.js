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

    forceYouTubeSearch,

    findCustomEmoji,
};
