'use strict';

const Discord = require('discord.js');

const { GuildConfigsManager } = require('./GuildConfigsManager.js');
const { BlacklistedUsersManager } = require('./BlacklistedUsersManager.js');
const { BlacklistedGuildsManager } = require('./BlacklistedGuildsManager.js');

//---------------------------------------------------------------------------------------------------------------//

const client = new Discord.Client({
    /** @TODO DJSv13 */
    // allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    disableMentions: 'everyone',
    partials: [
        'MESSAGE',
        'CHANNEL',
        'REACTION',
    ],
    presence: {
        status: 'online',
        type: 4,
        activity: {
            type: 'PLAYING',
            name: 'Just restarted!',
        },
    },
    /** @TODO DJSv13 */
    // intents: [
    //     Discord.Intents.NON_PRIVILEGED,
    //     Discord.Intents.FLAGS.GUILD_MEMBERS,
    // ],
    ws: {
        intents: [
            Discord.Intents.NON_PRIVILEGED,
            Discord.Intents.FLAGS.GUILD_MEMBERS,
        ],
    },
    messageCacheMaxSize: 50, // keep 50 messages cached in each channel
    messageCacheLifetime: 60 * 5, // messages should be kept for 5 minutes
    messageSweepInterval: 60 * 5, // sweep messages every 5 minutes
});

client.$ = {
    _shard_id: undefined,
    restarting_bot: false,
    lockdown_mode: false,
    bot_guilds: {
        emoji: undefined,
        logging: undefined,
        support: undefined,
    },
    guild_lockdowns: new Discord.Collection(),
    dispatchers: new Discord.Collection(),
    queue_managers: new Discord.Collection(),
    volume_managers: new Discord.Collection(),
    audio_controllers: new Discord.Collection(),
    guild_configs_manager: new GuildConfigsManager(process.env.BOT_GUILD_CONFIGS_FILE),
    blacklisted_users_manager: new BlacklistedUsersManager(process.env.BOT_BLACKLISTED_USERS_FILE),
    blacklisted_guilds_manager: new BlacklistedGuildsManager(process.env.BOT_BLACKLISTED_GUILDS_FILE),
};

console.time('client.login -> client#ready');
client.login(process.env.BOT_DISCORD_API_TOKEN);

module.exports = {
    Discord,
    client,
};
