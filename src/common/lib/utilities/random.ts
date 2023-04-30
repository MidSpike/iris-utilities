//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

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
 * Fetches a random item from the specified array.
 */
export function randomItemFromArray<T=unknown>(
    array_of_things: T[],
): T {
    return array_of_things[randomNumberFromInclusiveRange(0, array_of_things.length - 1)];
}
