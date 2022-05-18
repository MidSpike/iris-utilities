'use strict';

//------------------------------------------------------------//

// eslint-disable-next-line no-unused-expressions
require('manakin').global;

//------------------------------------------------------------//

import path from 'node:path';

import Discord from 'discord.js';

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
    execArgv: [
        '--trace-warnings',
    ],
    token: process.env.DISCORD_BOT_API_TOKEN,
    totalShards: 'auto',
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
sharding_manager.spawn();
