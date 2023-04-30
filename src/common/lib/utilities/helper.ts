//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

/**
 * Asynchronous setTimeout for pausing the current thread.
 */
export function delay(
    time_in_milliseconds: number,
): Promise<void> {
    return new Promise((resolve) => setTimeout(() => resolve(), time_in_milliseconds));
}

//------------------------------------------------------------//

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

//------------------------------------------------------------//

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
