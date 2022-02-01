'use strict';

//------------------------------------------------------------//

require('dotenv').config();
require('manakin').global;

//------------------------------------------------------------//

const Discord = require('discord.js');

//------------------------------------------------------------//

const sharding_manager = new Discord.ShardingManager('./src/discord_bot.js', {
    execArgv: [
        '--trace-warnings',
    ],
    token: process.env.DISCORD_BOT_API_TOKEN,
    totalShards: 1, // 'auto'
});

//------------------------------------------------------------//

sharding_manager.on('shardCreate', (shard) => {
    console.log(`<DC S#(${shard.id})> shard created.`);

    shard.on('ready', () => {
        console.success(`<DC S#(${shard.id})> shard ready.`);
    });
});

sharding_manager.on('spawn', (shard) => {
    console.success(`<DC S#(${shard.id})> shard spawned.`);
});

//------------------------------------------------------------//

async function main() {
    console.log('<SM> spawning shards...');
    sharding_manager.spawn();
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
