const Discord = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

const client = new Discord.Client({
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
    messageCacheMaxSize: 50, // keep 50 messages cached in each channel
    messageCacheLifetime: 60 * 5, // messages should be kept for 5 minutes
    messageSweepInterval: 60 * 5, // sweep messages every 5 minutes
});

console.time(`client.login -> 'ready' event`);
client.login(process.env.BOT_DISCORD_API_TOKEN);

module.exports = {
    Discord,
    client,
};
