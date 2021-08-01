'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { Player } = require('discord-player');

//------------------------------------------------------------//

/**
 * @typedef {Discord.Snowflake} GuildId
 */

//------------------------------------------------------------//

class AudioManager {
    /** @type {Discord.Collection<GuildId, Player>} */
    static players = new Discord.Collection();

    /**
     * @param {GuildId} guild_id
     */
    static async fetchPlayer(guild_id) {
        return AudioManager.players.get(guild_id);
    }

    /**
     * @param {GuildId} guild_id
     * @returns {Promise<Player>}
     */
    static async createPlayer(discord_client, guild_id) {
        const player = new Player(discord_client, {
            enableLive: true,
            volume: 25,
            useSafeSearch: false,
            bufferingTimeout: 2_500,
            ytdlOptions: {
                lang: 'en',
                filter: 'audioonly',
                highWaterMark: 1<<25,
                requestOptions: {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.5',
                        'User-Agent': process.env.YTDL_USER_AGENT,
                        'Cookie': process.env.YTDL_COOKIE,
                        'x-youtube-identity-token': process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN,
                    },
                },
            },
        });

        player.on('error', (queue, error) => console.trace('error', { queue }, error));
        player.on('connectionError', (queue, error) => console.trace('connectionError', { queue }, error));

        player.on('trackStart', (queue, track) => {
            queue.metadata.send(`🎶 | Started playing: **${track.title}** in **${queue.connection.channel.name}**!`);
        });

        player.on('trackAdd', (queue, track) => {
            queue.metadata.send(`🎶 | Track **${track.title}** queued!`);
        });

        player.on('botDisconnect', (queue) => {
            queue.metadata.send('❌ | I was manually disconnected from the voice channel, clearing queue!');
        });

        player.on('channelEmpty', (queue) => {
            queue.metadata.send('❌ | Nobody is in the voice channel, leaving...');
        });

        player.on('queueEnd', (queue) => {
            queue.metadata.send('✅ | Queue finished!');
        });

        AudioManager.players.set(guild_id, player);

        return player;
    }
}

//------------------------------------------------------------//

module.exports = {
    AudioManager,
};
