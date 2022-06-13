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
    token: process.env.DISCORD_BOT_API_TOKEN,
    execArgv: [
        '--trace-warnings',
    ],
    shardArgs: [
        '--trace-warnings',
    ],
    totalShards: 'auto',
    respawn: true,
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
sharding_manager.spawn({
    timeout: 60_000,
    delay: 10_000,
    amount: 'auto',
});
