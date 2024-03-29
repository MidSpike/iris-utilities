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

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const discord_bot_api_token = parseEnvironmentVariable(
    EnvironmentVariableName.DiscordBotApiToken,
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

const discord_bot_entry_file_path = path.join(process.cwd(), 'dist', 'discord_bot.js');
const sharding_manager = new Discord.ShardingManager(discord_bot_entry_file_path, {
    mode: 'process',
    token: discord_bot_api_token,
    totalShards: 'auto', // how many shards to spawn in total
    respawn: true, // whether to respawn a shard when it dies
    execArgv: [
        '--trace-warnings',
    ],
});

//------------------------------------------------------------//

sharding_manager.on('shardCreate', (shard) => {
    console.log(`<DC S#(${shard.id})> shard created.`);

    shard.on('ready', () => {
        console.info(`<DC S#(${shard.id})> shard ready.`);
    });
});

//------------------------------------------------------------//

console.log('<SM> spawning shards...');
void sharding_manager.spawn({
    amount: 'auto', // how many shards to spawn
    delay: 5_000, // how long to wait between shards spawning
    timeout: 2 * 60_000, // how long to wait for a shard to become ready before continuing to the next shard
});

//------------------------------------------------------------//

setInterval(() => {
    console.log('<SM> respawning all shards...');
    void sharding_manager.respawnAll({
        shardDelay: 5_000, // how long to wait between shards spawning
        respawnDelay: 5_000, // how long to wait between killing a shard and restarting it
        timeout: 2 * 60_000, // how long to wait for a shard to become ready before continuing to the next shard
    });
}, 24 * 60 * 60_000); // restart all shards every interval
