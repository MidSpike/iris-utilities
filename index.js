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
            type: 'for_client__shard_id',
            data: {
                shard_id: shard.id,
            },
        });
    });

    shard.on('message', (message) => {
        if (message.type === 'for_shard__logging_anonymous_commands') {
            sharding_manager.broadcast({
                ...message,
                type: 'for_client__logging_anonymous_commands',
            });
        }
        if (message.type === 'for_shard__logging_guild_create_or_delete') {
            sharding_manager.broadcast({
                ...message,
                type: 'for_client__logging_guild_create_or_delete',
            });
        }
    });
});

sharding_manager.spawn();
