//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

import { stringEllipses } from '@root/common/lib/utilities';

//------------------------------------------------------------//

/**
 * Diagnostic logs are used to log important information that may be useful for debugging.
 * This is not intended for logging user actions or sensitive information.
 *
 * An example of a diagnostic log would be if an error occurs whilst a command executes.
 *
 * A diagnostic log should be limited to 1024 characters.
 */
type DiagnosticLog = string;

/**
 * Diagnostic logs are limited to a backlog of 25 logs before removing the oldest log.
 * This is to prevent potential memory leaks and api spam.
 */
type DiagnosticsLogs = DiagnosticLog[];

//------------------------------------------------------------//

const diagnostics_webhook_url = process.env.DISCORD_BOT_CENTRAL_LOGGING_DIAGNOSTICS_WEBHOOK as string;
if (!diagnostics_webhook_url?.length) throw new Error('DISCORD_BOT_CENTRAL_LOGGING_DIAGNOSTICS_WEBHOOK is undefined or empty');

//------------------------------------------------------------//

export class DiagnosticsLogger {
    public static initialized: boolean = false;

    public static logs: DiagnosticsLogs = [];

    private static _interval: NodeJS.Timer | undefined;

    public static async initialize(): Promise<void> {
        if (DiagnosticsLogger.initialized) return;
        DiagnosticsLogger.initialized = true;

        DiagnosticsLogger._interval = setInterval(() => {
            if (!DiagnosticsLogger.logs) return;

            // fetch the newest diagnostic log, and remove it from the array
            const diagnostic_log = DiagnosticsLogger.logs.pop();
            if (!diagnostic_log) return;

            axios({
                method: 'POST',
                url: diagnostics_webhook_url,
                data: diagnostic_log,
                validateStatus: (status_code) => status_code >= 200 && status_code < 300,
            }).then(
                () => {
                    console.log('DiagnosticLogger: sent diagnostic log successfully');
                }
            ).catch(
                (error) => {
                    console.trace('DiagnosticLogger: failed to send diagnostic log;', error);

                    /** @todo remove hyper-aggressive fail-safe after testing */
                    console.warn('DiagnosticLogger: shutting down process');
                    process.exit(1); // shutdown the process
                }
            );
        }, 5_000); // every 5 seconds
    }

    public static async destroy(): Promise<void> {
        if (!DiagnosticsLogger.initialized) return;

        if (DiagnosticsLogger._interval) {
            clearInterval(DiagnosticsLogger._interval);
            DiagnosticsLogger._interval = undefined;
        }

        DiagnosticsLogger.logs = [];

        DiagnosticsLogger.initialized = false;

        return;
    }

    public static async log(
        diagnostic_log: DiagnosticLog
    ): Promise<void> {
        if (!DiagnosticsLogger.logs) return;

        // prepare the diagnostic log, then push it to the logs queue
        DiagnosticsLogger.logs.push(
            stringEllipses(Discord.escapeMarkdown(diagnostic_log), 1024)
        );

        // if there are too many diagnostic logs, remove the oldest log
        if (DiagnosticsLogger.logs.length > 25) {
            DiagnosticsLogger.logs.shift();
        }

        return;
    }
}
