'use strict';

//------------------------------------------------------------//

require('dotenv').config();
require('manakin').global;

//------------------------------------------------------------//

const path = require('path');
const Discord = require('discord.js');
const recursiveReadDirectory = require('recursive-read-directory');

const { ClientCommandManager } = require('./common/client_commands');

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
        } catch {
            console.trace('unable to load client event:', client_event_file_path);
            continue;
        }
    }
}

async function registerDiscordClientCommands() {
    const path_to_command_files = path.join(process.cwd(), 'src', 'commands');
    const client_command_file_names = recursiveReadDirectory(path_to_command_files);

    for (const client_command_file_name of client_command_file_names) {
        const client_command_file_path = path.join(path_to_command_files, client_command_file_name);

        console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> loading client command...`, { client_command_file_path });

        try {
            const client_command = require(client_command_file_path);
            await ClientCommandManager.loadCommand(client_command);
        } catch {
            console.trace('unable to load client command:', client_command_file_path);
            continue;
        }
    }
}

//------------------------------------------------------------//

async function main() {
    console.log('<DC> Logging in...');
    discord_client.login(process.env.DISCORD_BOT_API_TOKEN);
    
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering events...`);
    await registerDiscordClientEvents();
    
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering commands...`);
    await registerDiscordClientCommands();
    
    console.success(`<DC S#(${discord_client.shard.ids.join(', ')})> initialized.`);
}

main();

//------------------------------------------------------------//

module.exports = {
    discord_client,
};
