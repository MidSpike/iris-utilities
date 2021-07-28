'use strict';

//------------------------------------------------------------//

require('dotenv').config();
require('manakin').global;

//------------------------------------------------------------//

const path = require('path');
const Discord = require('discord.js');
const recursiveReadDirectory = require('recursive-read-directory');

const { client_commands } = require('./common/client_commands');

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

function registerDiscordClientEvents() {
    const path_to_event_files = path.join(process.cwd(), 'src', 'events');
    const client_event_file_names = recursiveReadDirectory(path_to_event_files);

    for (const client_event_file_name of client_event_file_names) {
        const event_file_path = path.join(path_to_event_files, client_event_file_name);
        const client_event = require(event_file_path);

        console.log({
            client_event,
        });

        discord_client.on(client_event.name, client_event.handler);
    }
}

function registerDiscordClientCommands() {
    const path_to_command_files = path.join(process.cwd(), 'src', 'commands');
    const client_command_file_names = recursiveReadDirectory(path_to_command_files);

    for (const client_command_file_name of client_command_file_names) {
        const command_file_path = path.join(path_to_command_files, client_command_file_name);
        const client_command = require(command_file_path);

        console.log({
            client_command,
        });

        client_commands.set(client_command.name, client_command);
    }
}

//------------------------------------------------------------//

async function main() {
    console.log('<DC> Logging in...');
    discord_client.login(process.env.BOT_DISCORD_API_TOKEN);
    
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering events...`);
    registerDiscordClientEvents();
    
    console.log(`<DC S#(${discord_client.shard.ids.join(', ')})> registering commands...`);
    registerDiscordClientCommands();
    
    console.success(`<DC S#(${discord_client.shard.ids.join(', ')})> initialized.`);
}

main();

//------------------------------------------------------------//

module.exports = {
    discord_client,
};
