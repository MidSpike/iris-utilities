'use strict';

//------------------------------------------------------------//

require('dotenv').config();
require('manakin').global;

//------------------------------------------------------------//

const path = require('path');
const Discord = require('discord.js');
const recursiveReadDirectory = require('recursive-read-directory');

const { addSpeechEvent } = require('discord-speech-recognition');

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
        activities: [
            {
                type: 'PLAYING',
                name: 'hello world!',
            },
        ],
    },
});

/* adds speech recognition to discord client */
addSpeechEvent(discord_client);

//------------------------------------------------------------//

async function registerDiscordClientEvents() {
    const path_to_event_files = path.join(process.cwd(), 'src', 'events');
    const client_event_file_names = recursiveReadDirectory(path_to_event_files);

    for (const client_event_file_name of client_event_file_names) {
        const client_event_file_path = path.join(path_to_event_files, client_event_file_name);

        console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> loading client event...`, { client_event_file_path });

        try {
            const client_event = require(client_event_file_path);
            discord_client.on(client_event.name, (...args) => client_event.handler(discord_client, ...args));
        } catch (error) {
            console.trace('unable to load client event:', client_event_file_path, error);
            continue;
        }
    }
}

//------------------------------------------------------------//

async function main() {
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering events...`);
    await registerDiscordClientEvents();

    console.log('<DC> Logging in...');
    discord_client.login(process.env.DISCORD_BOT_API_TOKEN);

    console.success(`<DC S#(${discord_client.shard.ids.join(', ')})> initialized.`);
}

main();

//------------------------------------------------------------//

/* prevent the process from crashing for unhandledRejections */
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.trace('unhandledRejection:', reason?.stack ?? reason, promise);
    console.error('----------------------------------------------------------------------------------------------------------------');
});

/* prevent the process from crashing for uncaughtExceptions */
process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.trace('uncaughtException:', error);
    console.error('----------------------------------------------------------------------------------------------------------------');
});
