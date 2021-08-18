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
        const player = new Player(discord_client, {});

        player.on('error', (queue, error) => console.trace('error', { queue }, error));
        player.on('connectionError', (queue, error) => console.trace('connectionError', { queue }, error));

        player.on('botDisconnect', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    {
                        description: 'I was manually disconnected from the voice channel, clearing queue!',
                    },
                ],
            });
        });

        player.on('queueEnd', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    {
                        description: 'Queue ended!',
                    },
                ],
            });
        });

        player.on('channelEmpty', (queue) => {
            queue.metadata.channel.send({
                embeds: [
                    {
                        description: 'Nobody is in the voice channel, leaving...',
                    },
                ],
            });
        });

        player.on('trackStart', (queue, track) => {
            queue.metadata.channel.send({
                embeds: [
                    {
                        description: `${queue.metadata.user}, Started playing: **${track.title}** in **${queue.connection.channel.name}**!`,
                    },
                ],
            });
        });

        player.on('trackAdd', (queue, track) => {
            queue.metadata.channel.send({
                embeds: [
                    {
                        description: `${queue.metadata.user}, Added **${track.title}** to the queue!`,
                    },
                ],
            });
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
}

//------------------------------------------------------------//

class VolumeManager {
    static global_minimum_volume = 0;
    static global_default_volume = 50;
    static global_maximum_volume = 100;
    static global_scaled_maximum_volume = 30;

    /**
     * @param {Number} input
     * @param {Number} multiple
     * @returns {Number} the locked multiple
     */
    static lockToNearestMultipleOf(input, multiple) {
        return Math.round(input / multiple) * multiple;
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

module.exports = {
    AudioManager,
    VolumeManager,
};
