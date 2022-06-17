//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

// eslint-disable-next-line no-unused-expressions
require('module-alias/register');

// eslint-disable-next-line no-unused-expressions
require('manakin').global;

//------------------------------------------------------------//

import * as path from 'node:path';

import * as Discord from 'discord.js';

import { addSpeechEvent } from 'discord-speech-recognition';

import { ClientInteractionManager } from '@root/common/app/client_interactions';

const recursiveReadDirectory = require('recursive-read-directory');

type DiscordClientWithSharding = Discord.Client<true> & {
    shard: Discord.ShardClientUtil;
};

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
}) as DiscordClientWithSharding;

/* adds speech recognition to discord client */
addSpeechEvent(discord_client as any); // eslint-disable-line @typescript-eslint/no-explicit-any

//------------------------------------------------------------//

async function registerClientEvents(discord_client: DiscordClientWithSharding) {
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

    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> Logging in...`);
    try {
        discord_client.login(process.env.DISCORD_BOT_API_TOKEN);
    } catch (error) {
        console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to login`, error);

        process.exit(1);
    }

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> initialized.`);
}

main();
