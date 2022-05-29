'use strict';

//------------------------------------------------------------//

// eslint-disable-next-line no-unused-expressions
require('manakin').global;

//------------------------------------------------------------//

import path from 'node:path';

import Discord from 'discord.js';

import { addSpeechEvent } from 'discord-speech-recognition';

import { ClientInteractionManager } from './common/app/client_interactions';

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
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_BANS,
        Discord.Intents.FLAGS.GUILD_MEMBERS,
        Discord.Intents.FLAGS.GUILD_VOICE_STATES,
        Discord.Intents.FLAGS.GUILD_INVITES,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.GUILD_WEBHOOKS,
        Discord.Intents.FLAGS.GUILD_INTEGRATIONS,
        Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Discord.Intents.FLAGS.GUILD_SCHEDULED_EVENTS,
        Discord.Intents.FLAGS.DIRECT_MESSAGES,
    ],
    partials: [
        'USER',
        'CHANNEL',
        'GUILD_MEMBER',
        'MESSAGE',
        'REACTION',
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

        console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> loading client event... ${client_event_file_path}`);

        try {
            const { default: client_event } = await import(client_event_file_path);

            discord_client.on(client_event.name, (...args) => client_event.handler(discord_client, ...args));
        } catch (error) {
            console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to load client event: ${client_event_file_path}`, error);

            continue;
        }
    }
}

//------------------------------------------------------------//

async function main() {
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering events...`);
    await registerClientEvents(discord_client);

    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering interactions...`);
    await ClientInteractionManager.registerClientInteractions(discord_client);

    console.log('<DC> Logging in...');
    discord_client.login(process.env.DISCORD_BOT_API_TOKEN);

    console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> initialized.`);
}

main();
