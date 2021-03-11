'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

//---------------------------------------------------------------------------------------------------------------//

const os = require('os');
os.setPriority(0, os.constants.priority.PRIORITY_HIGH);

const { ShardingManager } = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

const sharding_manager = new ShardingManager('./bot.js', {
    execArgv: [
        '--trace-warnings',
    ],
    token: process.env.BOT_DISCORD_API_TOKEN,
    totalShards: 4, // 'auto'
});

sharding_manager.on('shardCreate', (shard) => {
    console.log(`----------------------------------------------------------------------------------------------------------------`);
    console.log(`Launched shard: ${shard.id}`);
    console.log(`----------------------------------------------------------------------------------------------------------------`);

    shard.on('ready', () => {
        shard.send({
            type: 'shard_id',
            data: {
                shard_id: shard.id,
            },
        });
    });
});

sharding_manager.spawn();
