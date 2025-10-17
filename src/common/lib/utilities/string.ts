//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

/**
 * Ellipses a string to a specified length (including the ellipses).
 */
export function stringEllipses(
    string_to_ellipses: string,
    output_length_limit: number = Number.MAX_SAFE_INTEGER,
    ellipses: string = '...',
): string {
    const shortened_string = string_to_ellipses.slice(0, output_length_limit - ellipses.length);
    const shortened_string_with_ellipses = `${shortened_string}${shortened_string.length < string_to_ellipses.length ? ellipses : ''}`;

    return shortened_string_with_ellipses;
}

/**
 * Returns an array of strings split by a character limit while preserving whole words.
 *
 * @todo test this with a string that has a word longer than the chunk length limit
 */
export function stringChunksPreserveWords(
    string_to_split: string,
    chunk_length_limit: number,
): string[] {
    const words = string_to_split.split(' ');
    const chunks = [];

    let current_chunk = '';
    for (const word of words) {
        const new_chunk = `${current_chunk}${current_chunk ? ' ' : ''}${word}`;

        if (new_chunk.length <= chunk_length_limit) {
            current_chunk = new_chunk;
            continue;
        }

        chunks.push(current_chunk.trim()); // trim to remove the trailing space

        current_chunk = word;
    }

    if (current_chunk.length > 0) {
        chunks.push(current_chunk.trim()); // trim to remove the trailing space
    }

    return chunks;
}

/**
 * Compares two strings using the Dice coefficient algorithm to determine their similarity.
 *
 * The function calculates similarity by:
 * 1. Removing all whitespace from both strings
 * 2. Creating bigrams (pairs of consecutive characters) from the first string
 * 3. Counting intersections with bigrams from the second string
 * 4. Returning a similarity score between 0 and 1
 *
 * @param first - The first string to compare
 * @param second - The second string to compare
 * @returns A number between 0 and 1, where:
 *   - 1 means the strings are identical
 *   - 0 means the strings have no similarity
 *   - Values in between indicate partial similarity
 *
 * @example
 * ```typescript
 * compareTwoStrings("hello", "hello"); // returns 1
 * compareTwoStrings("hello", "world"); // returns 0
 * compareTwoStrings("hello", "helo"); // returns ~0.8
 * ```
 *
 * @see {@link https://github.com/aceakash/string-similarity/blob/41b2e0682f32cbd3c64eda62070fd2fdbddab381/src/index.js | Original implementation}
 */
export function compareTwoStrings(
    first: string,
    second: string,
) {
    first = first.replace(/\s+/g, '');
    second = second.replace(/\s+/g, '');

    if (first === second) return 1; // identical or empty
    if (first.length < 2 || second.length < 2) return 0; // if either is a 0-letter or 1-letter string

    let firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;

        firstBigrams.set(bigram, count);
    }

    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;

        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2.0 * intersectionSize) / (first.length + second.length - 2);
}
