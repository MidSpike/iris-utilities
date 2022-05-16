'use strict';

//------------------------------------------------------------//

/**
 * Asynchronous setTimeout
 */
function delay(time_in_milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(() => resolve(), time_in_milliseconds));
}

/**
 * Generates a random integer in an inclusive range: min <= return_value <= max
 */
function random_range_inclusive(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Ellipses a string to a specified length (including the ellipses)
 */
function string_ellipses(
    string_to_ellipses: string,
    output_length_limit: number = Number.MAX_SAFE_INTEGER,
    ellipses: string = '...',
): string {
    const shortened_string = string_to_ellipses.slice(0, output_length_limit - ellipses.length);
    const shortened_string_with_ellipses = `${shortened_string}${shortened_string.length < string_to_ellipses.length ? ellipses : ''}`;

    return shortened_string_with_ellipses;
}

/**
 * Splits an array into a new chunked array
 * @param {Array<*>} array_of_things
 * @param {Number} chunk_size
 * @returns {any[][]}
 */
function array_chunks(array_of_things: any[], chunk_size: number): any[][] {
    if (!Number.isInteger(chunk_size)) throw new Error('chunk_size must be an integer');

    const array_of_things_clone = [ ...array_of_things ]; // prevent mutation of the original array

    const chunks = [];
    while (array_of_things_clone.length) {
        chunks.push(array_of_things_clone.splice(0, chunk_size));
    }

    return chunks;
}

/**
 * Fetches a random item from the specified array
 */
function array_random(array_of_things: any[]): any {
    return array_of_things[random_range_inclusive(0, array_of_things.length - 1)];
}

//------------------------------------------------------------//

module.exports = {
    delay,
    random_range_inclusive,
    string_ellipses,
    array_chunks,
    array_random,
};
