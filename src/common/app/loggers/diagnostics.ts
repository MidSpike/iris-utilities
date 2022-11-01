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
 */
type DiagnosticLog = string;

//------------------------------------------------------------//

const diagnostics_webhook_url = process.env.DISCORD_BOT_CENTRAL_LOGGING_DIAGNOSTICS_WEBHOOK as string;
if (!diagnostics_webhook_url?.length) throw new Error('DISCORD_BOT_CENTRAL_LOGGING_DIAGNOSTICS_WEBHOOK is undefined or empty');

//------------------------------------------------------------//

/**
 * The maximum length of a diagnostic log.
 * This is to comply with Discord's webhook message length limit.
 */
const diagnostic_log_max_characters = 1024;

/**
 * The maximum number of diagnostic logs that can be stored in the backlog.
 * This is to prevent potential memory leaks and api spam.
 */
const diagnostic_log_max_backlog = 25;

//------------------------------------------------------------//

export class DiagnosticsLogger {
    /**
     * Whether the diagnostics logger has been initialized.
     * When initialized, diagnostic logs will be periodically sent to the diagnostics webhook.
     */
    public static initialized: boolean = false;

    /**
     * Diagnostic logs are sorted from oldest to newest.
     */
    public static logs: DiagnosticLog[] = [];

    /**
     * Periodically sends diagnostic logs to the webhook.
     */
    private static _interval: NodeJS.Timer | undefined;

    /**
     * Initialize the diagnostics logger.
     * This should only be called once.
     */
    public static async initialize(): Promise<void> {
        if (DiagnosticsLogger.initialized) throw new Error('DiagnosticsLogger: singleton is already initialized');
        DiagnosticsLogger.initialized = true;

        DiagnosticsLogger._interval = setInterval(() => {
            // fetch the newest diagnostic log, and remove it from the array
            const diagnostic_log = DiagnosticsLogger.logs.pop();
            if (!diagnostic_log) return;

            axios({
                method: 'post',
                url: diagnostics_webhook_url,
                data: diagnostic_log,
                validateStatus: (status_code) => status_code >= 200 && status_code < 300,
            }).then(
                () => {
                    console.log('DiagnosticsLogger: sent diagnostic log successfully');
                }
            ).catch(
                (error) => {
                    console.trace('DiagnosticsLogger: failed to send diagnostic log;', error);
                }
            );
        }, 10_000); // every 10 seconds
    }

    /**
     * Destroys the diagnostics logger instance.
     * This should only be used for emergency situations.
     */
    public static async destroy(): Promise<void> {
        if (!DiagnosticsLogger.initialized) return;

        if (DiagnosticsLogger._interval) {
            clearInterval(DiagnosticsLogger._interval);
            DiagnosticsLogger._interval = undefined;
        }

        DiagnosticsLogger.logs.length = 0; // clear the logs array

        DiagnosticsLogger.initialized = false;

        return;
    }

    /**
     * Create and queue a diagnostic log.
     * Diagnostic logs can be queued before the logger is initialized.
     */
    public static async log(
        diagnostic_log: DiagnosticLog
    ): Promise<void> {
        // prepare the diagnostic log, then push it to the logs queue
        // additionally markdown syntax is escaped in the diagnostic log
        DiagnosticsLogger.logs.push(
            stringEllipses(Discord.escapeMarkdown(diagnostic_log), diagnostic_log_max_characters)
        );

        // if there are too many diagnostic logs, remove the oldest log
        if (DiagnosticsLogger.logs.length > diagnostic_log_max_backlog) {
            DiagnosticsLogger.logs.shift();
        }

        return;
    }
}
