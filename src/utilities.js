'use strict';

//---------------------------------------------------------------------------------------------------------------//

/**
 * Checks to see if the specified value is an Object literal `{}` or a `new Object`
 * @param {*} value 
 * @returns {Boolean} 
 */
function isObject(value) {
    return Object.is(value?.constructor, Object);
}

/**
 * Checks for a promise / thenable instance
 * @param {*} value 
 * @returns {Boolean} 
 */
function isThenable(value) {
    return typeof value?.then === 'function';
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Asynchronous setTimeout b/c I'm too lazy to type it out everywhere
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
    if (!isThenable(promise_to_race)) throw new TypeError('`promise_to_race` must be a promise or thenable!');
    if (isNaN(time_in_milliseconds)) throw new TypeError('`time_in_milliseconds` must be a number!');
    const forcedOutput = await Promise.race([promise_to_race, Timer(time_in_milliseconds)]);
    return forcedOutput ?? fallback_return_value;
}

/**
 * Generators "Unique" ids based off of the system time and a salt
 * @param {Number} salt_size 
 * @returns {String} 
 */
function pseudoUniqueId(salt_size=5) {
    if (isNaN(salt_size)) throw new TypeError('`salt_size` must be a number!');
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
    if (isNaN(num)) throw new TypeError('`num` must be a number!');
    if (isNaN(min)) throw new TypeError('`min` must be a number!');
    if (isNaN(max)) throw new TypeError('`max` must be a number!');
    return Math.min(max, Math.max(min, num));
}

/**
 * Generates a random integer in an inclusive range: min <= return_value <= max
 * @param {*} min 
 * @param {*} max 
 * @returns {Number} 
 */
function random_range_inclusive(min, max) {
    if (isNaN(min)) throw new TypeError('`min` must be a number!');
    if (isNaN(max)) throw new TypeError('`max` must be a number!');
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Creates an array of specified size and fill_value to fill holes
 * @param {*} size 
 * @param {*} fill_value 
 * @returns {Array<undefined>|Array<*>} 
 */
function array_make(size, fill_value=undefined) {
    if (isNaN(size)) throw new TypeError('`size` must be a number!');
    return Array(size).fill(fill_value);
}

/**
 * Grabs a random item from an array
 * @param {Array<*>} array_of_things 
 * @returns {*} 
 */
function array_random(array_of_things) {
    if (!Array.isArray(array_of_things)) throw new TypeError('`array_of_things` must be an array!');
    return array_of_things[random_range_inclusive(0, array_of_things.length - 1)];
}

/**
 * Inserts an item into an array at a specified index
 * @param {Array<*>} array_of_things 
 * @param {Number} insertion_index 
 * @param {*} item_to_be_inserted 
 * @returns {Array<*>} 
 */
function array_insert(array_of_things, insertion_index, item_to_be_inserted=undefined) {
    if (!Array.isArray(array_of_things)) throw new TypeError('`array_of_things` must be an array!');
    if (isNaN(insertion_index)) throw new TypeError('`insertion_index` must be a number!');
    return [...array_of_things.slice(0, insertion_index), item_to_be_inserted, ...array_of_things.slice(insertion_index)];
}

/**
 * Shuffles the items in an array and returns the array
 * @param {Array<*>} array_to_shuffle 
 * @returns {Array<*>} 
 */
function array_shuffle(array_to_shuffle) {
    if (!Array.isArray(array_to_shuffle)) throw new TypeError('`array_to_shuffle` must be an array!');
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
    if (!Array.isArray(array_of_things)) throw new TypeError('`array_of_things` must be an array!');
    if (isNaN(chunk_size)) throw new TypeError('`chunk_size` must be a number!');
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
    if (!isObject(object_of_things)) throw new TypeError('`object_of_things` must be an object literal!');
    return Object.keys(object_of_things).sort().reduce((r, k) => (r[k] = object_of_things[k], r), {});
}

/**
 * Converts seconds into a human readable format: HH:MM:SS
 * @param {Number} seconds 
 * @returns {String} HH:MM:SS (Hours : Minutes : Seconds)
 */
function getReadableTime(seconds) {
    if (isNaN(seconds)) throw new TypeError('`seconds` must be a Number!');
    return [(seconds / 3600), (seconds % 3600 / 60), (seconds % 60)].map(t => `0${Math.floor(t)}`).join(':').replace(/(0(?=\d{2,}))+/g, '');
}

/**
 * Ellipses a string if it exceeds a specified length
 * @param {String} string_to_ellipses 
 * @param {Number} output_length_limit 
 * @returns {String} 
 */
function string_ellipses(string_to_ellipses='', output_length_limit=Number.MAX_SAFE_INTEGER) {
    const ellipses = '...';
    const shortened_string = string_to_ellipses.slice(0, output_length_limit - ellipses.length);
    return `${shortened_string}${shortened_string.length < string_to_ellipses.length ? ellipses : ''}`;
}

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    isObject,
    isThenable,

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
    string_ellipses,
};
