'use strict';

//------------------------------------------------------------//

/**
 * Asynchronous setTimeout
 * @param {Number} time_in_milliseconds
 * @returns {Promise<void>}
 */
function delay(time_in_milliseconds) {
    if (typeof time_in_milliseconds !== 'number') throw new TypeError('\`time_in_milliseconds\` must be a number');

    return new Promise((resolve, reject) => setTimeout(() => resolve(), time_in_milliseconds));
}

/**
 * Generates a random integer in an inclusive range: min <= return_value <= max
 * @param {Number} min
 * @param {Number} max
 * @returns {Number}
 */
function random_range_inclusive(min, max) {
    if (typeof min !== 'number') throw new TypeError('\`min\` must be a number!');
    if (typeof max !== 'number') throw new TypeError('\`max\` must be a number!');

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Ellipses a string to a specified length (including the ellipses)
 * @param {String} string_to_ellipses
 * @param {Number} output_length_limit by default `Number.MAX_SAFE_INTEGER`
 * @param {String} ellipses by default `'...'`
 * @returns {String}
 */
function string_ellipses(string_to_ellipses, output_length_limit=Number.MAX_SAFE_INTEGER, ellipses='...') {
    if (typeof string_to_ellipses !== 'string') throw new TypeError('\`string_to_ellipses\` must be a string');
    if (typeof output_length_limit !== 'number') throw new TypeError('\`output_length_limit\` must be a number');
    if (typeof string_to_ellipses !== 'string') throw new TypeError('\`string_to_ellipses\` must be a string');

    const shortened_string = string_to_ellipses.slice(0, output_length_limit - ellipses.length);
    const shortened_string_with_ellipses = `${shortened_string}${shortened_string.length < string_to_ellipses.length ? ellipses : ''}`;

    return shortened_string_with_ellipses;
}

/**
 * Sorts an object based on it's keys (using Array.sort()) and returns the new sorted object
 * @param {Object} object_of_things
 * @returns {Object} the object sorted by its keys
 */
function object_sort(object_of_things) {
    if (typeof object_of_things !== 'object' || !object_of_things) throw new TypeError('\`object_of_things\` must be an object');

    const sorted_object_keys = Object.keys(object_of_things).sort();

    const sorted_object = {};
    for (const sorted_object_key of sorted_object_keys) {
        sorted_object[sorted_object_key] = object_of_things[sorted_object_key];
    }

    return sorted_object;
}

/**
 * Splits an array into a new chunked array
 * @param {Array<*>} array_of_things
 * @param {Number} chunk_size
 * @returns {any[][]}
 */
function array_chunks(array_of_things, chunk_size) {
    if (!Array.isArray(array_of_things)) throw new TypeError('\`array_of_things\` must be an array');
    if (typeof chunk_size !== 'number' || chunk_size !== Number.parseInt(chunk_size)) throw new TypeError('\`chunk_size\` must be a (whole) number');

    const array_of_things_clone = [ ...array_of_things ]; // prevent mutation of the original array

    const chunks = [];
    while (array_of_things_clone.length) {
        chunks.push(array_of_things_clone.splice(0, chunk_size));
    }

    return chunks;
}

/**
 * Fetches a random item from the specified array
 * @param {Array<*>} array_of_things
 * @returns {*}
 */
function array_random(array_of_things) {
    if (!Array.isArray(array_of_things)) throw new TypeError('\`array_of_things\` must be an array!');

    return array_of_things[random_range_inclusive(0, array_of_things.length - 1)];
}

//------------------------------------------------------------//

module.exports = {
    delay,
    random_range_inclusive,
    string_ellipses,
    object_sort,
    array_chunks,
    array_random,
};
