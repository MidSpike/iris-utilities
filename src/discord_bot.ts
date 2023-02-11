//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

// eslint-disable-next-line no-unused-expressions
require('module-alias/register'); // used for aliased project imports

// eslint-disable-next-line no-unused-expressions
require('manakin').global; // used for terminal output formatting

//------------------------------------------------------------//

import { DiscordClientWithSharding } from '@root/types';

import process from 'node:process';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import { attachSpeechEvent } from '@midspike/discord-speech-recognition';

import recursiveReadDirectory from 'recursive-read-directory';

import { ClientInteractionManager } from '@root/common/app/client_interactions';

import { shouldUserVoiceBeProcessed } from '@root/common/app/voice_receive';

import { DiagnosticsLogger } from '@root/common/app/loggers/loggers';

//------------------------------------------------------------//

const discord_bot_token = process.env.DISCORD_BOT_API_TOKEN as string;
if (!discord_bot_token?.length) throw new Error('DISCORD_BOT_API_TOKEN is not defined or is empty');

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
        Discord.GatewayIntentBits.GuildBans,
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

    for (const client_event_file_name of client_event_file_names) {
        if (!client_event_file_name.endsWith('.js')) continue;

        const client_event_file_path = path.join(path_to_event_files, client_event_file_name);

        console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering client event... ${client_event_file_path}`);

        try {
            const { default: client_event } = await import(client_event_file_path);

            discord_client.on(client_event.name, (...args) => client_event.handler(discord_client, ...args));
        } catch (error) {
            console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to register client event: ${client_event_file_path}`, error);

            continue;
        }
    }
}

//------------------------------------------------------------//

function runGarbageCollector(
    discord_client: DiscordClientWithSharding,
) {
    const garbageCollector = globalThis.gc;

    if (typeof garbageCollector !== 'function') {
        console.trace('Garbage collection is not exposed!');
        return;
    }

    console.warn(`<DC S#(${discord_client.shard.ids.join(', ')})> running garbage collector...`);

    try {
        garbageCollector();
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to run garbage collector`, error);
    }
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
        discord_client.login(discord_bot_token);
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to login`, error);

        process.exit(1);
    }

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> preparing diagnostics logger...`);
    try {
        DiagnosticsLogger.initialize();
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to initialize diagnostics logger`, error);

        process.exit(1);
    }

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

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> preparing garbage collector...`);
    setInterval(() => runGarbageCollector(discord_client), 5 * 60_000); // every 5 minutes

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> fully initialized.`);
}

main();
