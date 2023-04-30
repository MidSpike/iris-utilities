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
