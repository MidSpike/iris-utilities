//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

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
