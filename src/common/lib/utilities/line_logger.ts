//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

//------------------------------------------------------------//

/**
 * A simple logger that logs to a single line in the terminal.
 *
 * This is useful for logging progress updates or other information that spams and is synchronously linear in nature.
 *
 * Example:
 * ```ts
 * LineLogger.start(); // this will add a new line to the terminal and start the logger
 *
 * LineLogger.log('Loading file A...'); // this will overwrite the new line
 * await delay(1000);
 *
 * LineLogger.log('Loading file B...'); // this will overwrite the previous line
 * await delay(1000);
 *
 * LineLogger.log('Loaded all files!'); // this will overwrite the previous line
 * await delay(1000);
 *
 * LineLogger.stop(); // this will preserve the last line and end the logger with a new line
 * ```
 */
export class LineLogger {
    public static is_active: boolean = false;

    private static outputNewLine() {
        if (!this.is_active) throw new Error('LineLogger is not active!');

        process.stdout.write('\n');
    }

    private static clearLine() {
        if (!this.is_active) throw new Error('LineLogger is not active!');

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }

    public static log(
        message: string,
        persist: boolean = false,
    ) {
        if (!this.is_active) throw new Error('LineLogger is not active!');

        this.clearLine();

        process.stdout.write(message);

        if (persist) {
            this.outputNewLine();
        }
    }

    public static start() {
        if (this.is_active) throw new Error('LineLogger is already active!');

        this.is_active = true; // prevent the logger from being used out of order

        this.outputNewLine(); // ensure the first log is on a new line
    }

    public static stop() {
        if (!this.is_active) throw new Error('LineLogger is not active!');

        this.outputNewLine(); // ensure the output after the logger is on a new line

        this.is_active = false; // allow the logger to be reused after ending
    }
}
