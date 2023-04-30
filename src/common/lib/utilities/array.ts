//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

/**
 * Splits an array into a new chunked array containing arrays of a specified size (or less for the last chunk).
 */
export function arrayChunks<T=unknown>(
    array_of_things: T[],
    chunk_size: number,
): T[][] {
    if (!Number.isInteger(chunk_size)) throw new Error('chunk_size must be an integer');

    const array_of_things_clone = [ ...array_of_things ]; // prevent mutation of the original array

    const chunks = [];
    while (array_of_things_clone.length) {
        chunks.push(array_of_things_clone.splice(0, chunk_size));
    }

    return chunks;
}
