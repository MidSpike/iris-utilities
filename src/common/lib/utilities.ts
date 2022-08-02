//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

/**
 * Asynchronous setTimeout for pausing the current thread.
 */
export function delay(
    time_in_milliseconds: number,
): Promise<void> {
    return new Promise(resolve => setTimeout(() => resolve(), time_in_milliseconds));
}

/**
 * Generates an iterable inclusive range of numbers incrementing by the provided step.
 */
export function* inclusiveRange(
    start: number,
    end: number,
    step: number = 1,
): IterableIterator<number> {
    let current = start;

    while (current <= end) {
        yield current;
        current += step;
    }
}

/**
 * Generates a random integer in an inclusive range: min <= return_value <= max.
 */
export function randomNumberFromInclusiveRange(
    min: number,
    max: number,
): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

/**
 * Fetches a random item from the specified array.
 */
export function randomItemFromArray<T=unknown>(
    array_of_things: T[],
): T {
    return array_of_things[randomNumberFromInclusiveRange(0, array_of_things.length - 1)];
}

/**
 * Parses a URL from a string and will return undefined if the URL is invalid.
 */
export function parseUrlFromString(
    url_string: string,
): URL | undefined {
    let url;

    try {
        url = new URL(url_string);
    } catch (error) {
        return undefined;
    }

    return url;
}

/**
 * Replaces potentially problematic html characters with their html entity equivalents.
 */
export function escapeHtml(
    input_string: string,
): string {
    let output_string = input_string; // prevent mutation of the original string

    const regex_replacements: [ RegExp, string ][] = [
        [ /\&/gi, '&amp;' ],
        [ /\"/gi, '&quot;' ],
        [ /\'/gi, '&apos;' ],
        [ /\`/gi, '&grave;' ],
        [ /\</gi, '&lt;' ],
        [ /\>/gi, '&gt;' ],
        [ /\//gi, '&#47;' ],
        [ /\\/gi, '&#92;' ],
    ];

    for (const [ regex, replacement ] of regex_replacements) {
        output_string = output_string.replace(regex, replacement);
    }

    return output_string;
}
