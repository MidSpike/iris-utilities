'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');
const { Player, Queue } = require('discord-player');

const { CustomEmbed } = require('../app/message');

//------------------------------------------------------------//

/**
 * @typedef {Discord.Snowflake} GuildId
 */

//------------------------------------------------------------//

class VolumeManager {
    static global_minimum_volume = 0;
    static global_default_volume = 50;
    static global_maximum_volume = 100;
    static global_scaled_maximum_volume = 50;

    /**
     * @param {Number} input
     * @param {Number} multiple
     * @returns {Number} the locked multiple
     */
    static lockToNearestMultipleOf(input, multiple) {
        return Math.ceil(input / multiple) * multiple;
    }

    /**
     * @param {Number} normalized_volume_level
     * @returns {Number} the scaled volume level
     */
    static scaleVolume(normalized_volume_level) {
        const clamped_volume_level = Math.max(VolumeManager.global_minimum_volume, Math.min(normalized_volume_level, VolumeManager.global_maximum_volume));

        const scaled_volume_level = VolumeManager.global_scaled_maximum_volume * clamped_volume_level / VolumeManager.global_maximum_volume;

        return scaled_volume_level;
    }

    /**
     * @param {Number} scaled_volume_level
     * @returns {Number} the normalized volume level
     */
    static normalizeVolume(scaled_volume_level) {
        const normalized_volume_level = Math.floor(scaled_volume_level * VolumeManager.global_maximum_volume / VolumeManager.global_scaled_maximum_volume);

        return normalized_volume_level;
    }
}

//------------------------------------------------------------//

class AudioManager {
    /** @type {Discord.Collection<GuildId, Player>} */
    static players = new Discord.Collection();

    /**
     * @param {Discord.Client} discord_client
     * @param {GuildId} guild_id
     * @returns {Promise<Player>}
     */
    static async createPlayer(discord_client, guild_id) {
        const existing_player = AudioManager.players.get(guild_id);

        if (existing_player) {
            return existing_player;
        }

        const player = new Player(discord_client, {
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

        player.on('botDisconnect', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: 'I was disconnected from the voice channel, cleared the queue!',
                    }),
                ],
            });
        });

        player.on('channelEmpty', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: 'Nobody is in the voice channel, leaving...',
                    }),
                ],
            });
        });

        player.on('queueEnd', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: 'Queue ended!',
                    }),
                ],
            });
        });

        player.on('trackAdd', (queue, track) => {
            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        description: `${queue.metadata.user}, added **[${track.title}](${track.url})** to the queue!`,
                    }),
                ],
            });
        });

        player.on('trackStart', (queue, track) => {
            console.log(track);

            queue.metadata.channel.send({
                embeds: [
                    new CustomEmbed({
                        thumbnail: {
                            url: track.thumbnail,
                        },
                        description: [
                            `Now playing: **[${track.title}](${track.url})**`,
                            `Requested by: ${queue.metadata.user}`,
                        ].join('\n'),
                    }),
                ],
            });
        });

        AudioManager.players.set(guild_id, player);

        return player;
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {GuildId} guild_id
     * @param {Object?} metadata
     * @returns {Promise<Queue>}
     */
    static async createQueue(discord_client, guild_id, metadata=undefined) {
        const player = await AudioManager.createPlayer(discord_client, guild_id);

        return player.createQueue(guild_id, {
            autoSelfDeaf: false,
            metadata: metadata ?? player.getQueue(guild_id)?.metadata,
            enableLive: true,
            initialVolume: VolumeManager.scaleVolume(50),
            useSafeSearch: false,
            bufferingTimeout: 5_000,
            leaveOnEnd: true,
            leaveOnStop: false,
            leaveOnEmpty: false,
            leaveOnEmptyCooldown: 5 * 60_000,
        });
    }
}

//------------------------------------------------------------//

module.exports = {
    VolumeManager,
    AudioManager,
};
