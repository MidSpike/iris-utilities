const Discord = require('discord.js');

//---------------------------------------------------------------------------------------------------------------//

const client = new Discord.Client({
    disableMentions: 'everyone',
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    presence: {
        status: 'online',
        type: 4,
        activity: {
            type: 'PLAYING',
            name: 'Just restarted!'
        }
    },
    /** @TODO start */
    messageCacheMaxSize: 150,
    messageCacheLifetime: 60 * 30, // keep messages for 30 minutes at a time
    messageSweepInterval: 60 * 60, // Sweep messages every 60 minutes
    /** @TODO end */
});

client.login(process.env.BOT_DISCORD_API_TOKEN);

module.exports = {
    Discord,
    client,
};
