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
     * @private
     * @param {Discord.Client} discord_client
     * @param {GuildId} guild_id
     * @returns {Promise<Player>}
     */
    static async #createPlayer(discord_client, guild_id) {
        const player = new Player(discord_client, {
            enableLive: true,
            volume: 100, // this line possibly does nothing, but might be needed
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
            queue.metadata.send(`Started playing: **${track.title}** in **${queue.connection.channel.name}**!`);
        });

        player.on('trackAdd', (queue, track) => {
            queue.metadata.send(`Track **${track.title}** queued!`);
        });

        player.on('botDisconnect', (queue) => {
            queue.metadata.send('I was manually disconnected from the voice channel, clearing queue!');
        });

        player.on('channelEmpty', (queue) => {
            queue.metadata.send('Nobody is in the voice channel, leaving...');
        });

        player.on('queueEnd', (queue) => {
            queue.metadata.send('Queue finished!');
        });

        AudioManager.players.set(guild_id, player);

        return player;
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {GuildId} guild_id
     * @returns {Promise<Player>}
     */
    static async fetchPlayer(discord_client, guild_id) {
        return AudioManager.players.get(guild_id) ?? await AudioManager.#createPlayer(discord_client, guild_id);
    }

    /**
     * @param {Number} normalized_volume_level
     * @returns {Number} the scaled volume level
     */
    static scaleVolume(normalized_volume_level) {
        const minimum_allowed_volume = 0;
        const maximum_allowed_volume = 100;
        const scaled_maximum_volume = 30;

        const clamped_volume_level = Math.max(minimum_allowed_volume, Math.min(normalized_volume_level, maximum_allowed_volume));

        const scaled_volume_level = scaled_maximum_volume * clamped_volume_level / maximum_allowed_volume;

        return scaled_volume_level;
    }

    /**
     * @param {Number} scaled_volume_level
     * @returns {Number} the normalized volume level
     */
    static normalizeVolume(scaled_volume_level) {
        const maximum_allowed_volume = 100;
        const scaled_maximum_volume = 30;

        const normalized_volume_level = Math.round(scaled_volume_level * maximum_allowed_volume / scaled_maximum_volume);

        return normalized_volume_level;
    }
}

//------------------------------------------------------------//

module.exports = {
    AudioManager,
};
