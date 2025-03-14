//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

// eslint-disable-next-line no-unused-expressions
require('module-alias/register'); // used for aliased project imports

// eslint-disable-next-line no-unused-expressions
require('manakin').global; // used for terminal output formatting

//------------------------------------------------------------//

import process from 'node:process';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import { attachSpeechEvent } from 'discord-speech-recognition';

import recursiveReadDirectory from 'recursive-read-directory';

import { ClientEventExport, DiscordClientWithSharding } from '@root/types';

import { ClientInteractionManager } from '@root/common/app/client_interactions';

import { shouldUserVoiceBeProcessed } from '@root/common/app/voice_receive';

import { DiagnosticsLogger } from '@root/common/app/loggers/loggers';

import { EnvironmentVariableName, LineLogger, parseEnvironmentVariable } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const discord_bot_api_token = parseEnvironmentVariable(
    EnvironmentVariableName.DiscordBotApiToken,
    'string',
    (value) => value.length > 0,
);

const discord_bot_voice_commands = parseEnvironmentVariable(
    EnvironmentVariableName.DiscordBotVoiceCommands,
    'string',
    (value) => value.length > 0,
);

//------------------------------------------------------------//

/* prevent the process from crashing for unhandledRejections */
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------');
    console.trace('unhandledRejection:', reason, promise);
    console.error('----------------------------------------------------------------');
});

/* prevent the process from crashing for uncaughtExceptions */
process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------');
    console.trace('uncaughtException:', error);
    console.error('----------------------------------------------------------------');
});

//------------------------------------------------------------//

const discord_client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildModeration,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildVoiceStates,
        Discord.GatewayIntentBits.GuildInvites,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildWebhooks,
        Discord.GatewayIntentBits.GuildIntegrations,
        Discord.GatewayIntentBits.GuildEmojisAndStickers,
        Discord.GatewayIntentBits.GuildScheduledEvents,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.MessageContent,
    ],
    partials: [
        Discord.Partials.User,
        Discord.Partials.Channel,
        Discord.Partials.GuildMember,
        Discord.Partials.Message,
        Discord.Partials.Reaction,
    ],
    presence: {
        status: 'online',
    },
    // attempt to reduce memory usage
    sweepers: {
        // every 5 minutes, sweep messages that are older than 1 hour
        messages: {
            interval: 5 * 60, // 5 minutes in seconds
            lifetime: 1 * 60 * 60, // 1 hour in seconds
        },
    },
}) as DiscordClientWithSharding;

//------------------------------------------------------------//

async function registerClientEvents(
    discord_client: DiscordClientWithSharding,
) {
    const path_to_event_files = path.join(process.cwd(), 'dist', 'events');
    const client_event_file_names = recursiveReadDirectory(path_to_event_files);

    LineLogger.start();
    for (const client_event_file_name of client_event_file_names) {
        if (!client_event_file_name.endsWith('.js')) continue;

        const client_event_file_path = path.join(path_to_event_files, client_event_file_name);

        // console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering client event... ${client_event_file_path}`);
        LineLogger.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering client event... ${client_event_file_path}`);

        try {
            /**
             * IMPORTANT: use commonjs require instead of esm import here
             */
            const { default: client_event } = require(client_event_file_path) as {
                default: ClientEventExport<keyof Discord.ClientEvents>,
            };

            discord_client.on(client_event.name, async (...args: unknown[]) => client_event.handler(discord_client, ...args as Discord.ClientEvents[keyof Discord.ClientEvents]));
        } catch (error) {
            // console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to register client event: ${client_event_file_path}`, error);
            LineLogger.log(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to register client event: ${client_event_file_path}:\n${error}`, true);

            continue;
        }
    }
    LineLogger.stop();
}

//------------------------------------------------------------//

async function main() {
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering events...`);
    try {
        await registerClientEvents(discord_client);
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to register client events`, error);

        process.exit(1);
    }

    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering interactions...`);
    try {
        await ClientInteractionManager.registerClientInteractions(discord_client);
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to register client interactions`, error);

        process.exit(1);
    }

    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> logging in...`);
    try {
        await discord_client.login(discord_bot_api_token);
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to login`, error);

        process.exit(1);
    }

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> preparing diagnostics logger...`);
    try {
        await DiagnosticsLogger.initialize();
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to initialize diagnostics logger`, error);

        process.exit(1);
    }

    if (discord_bot_voice_commands === 'enabled') {
        console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> preparing speech recognition system...`);
        try {
            attachSpeechEvent({
                client: discord_client as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                shouldProcessUserId: (user_id) => shouldUserVoiceBeProcessed(discord_client, user_id),
            });
        } catch (error) {
            console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to initialize speech recognition system`, error);

            process.exit(1);
        }
    }

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> fully initialized.`);
}

void main();
