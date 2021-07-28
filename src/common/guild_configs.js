'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { go_mongo_db } = require('./go_mongo_db');

//------------------------------------------------------------//

/**
 * @typedef {String} GuildId
 * @typedef {Object.<string, any>} GuildConfig
 * @typedef {{
 *  guild_id: GuildId,
 *  config: GuildConfig,
 *  epoch: number,
 * }} GuildConfigCacheItem
 * @typedef {Discord.Collection<GuildId, GuildConfigCacheItem>} GuildConfigCacheItems
 */

//------------------------------------------------------------//

class GuildConfigsManager {
    static cache_lifespan = 5 * 60_000; // 5 minutes

    /** @type {GuildConfigCacheItems} */
    static cache = new Discord.Collection();

    static get guild_config_template() {
        return {
            _creation_epoch: Date.now(),
            command_prefix: process.env.DISCORD_BOT_PREFIX,
        };
    }

    /**
     * @param {GuildId} guild_id
     * @param {boolean} [bypass_cache=false]
     * @return {Promise<GuildConfig>}
     */
    static async fetch(guild_id, bypass_cache=false) {
        if (typeof guild_id !== 'string') throw new TypeError('guild_id must be a string');
        if (typeof bypass_cache !== 'boolean') throw new TypeError('bypass_cache must be a boolean');

        const guild_config_cache_item = GuildConfigsManager.cache.get(guild_id);

        let guild_config = guild_config_cache_item?.config;

        const current_epoch = Date.now();
        const cached_guild_config_has_expired = current_epoch >= (guild_config_cache_item?.epoch ?? current_epoch) + GuildConfigsManager.cache_lifespan;

        if (!guild_config || cached_guild_config_has_expired || bypass_cache) {
            const [ db_guild_config ] = await go_mongo_db.find(process.env.MONGO_DATABASE_NAME, process.env.MONGO_GUILD_CONFIGS_COLLECTION_NAME, {
                'guild_id': guild_id,
            });

            guild_config = db_guild_config ?? await GuildConfigsManager.create(guild_id);
        }

        return guild_config;
    }

    /**
     * @param {GuildId} guild_id
     * @return {Promise<GuildConfig>}
     */
    static async create(guild_id) {
        if (typeof guild_id !== 'string') throw new TypeError('guild_id must be a string');

        const guild_config_template = GuildConfigsManager.guild_config_template;

        const new_guild_config = {
            'guild_id': guild_id,
            ...guild_config_template,
        };

        try {
            await go_mongo_db.add(process.env.MONGO_DATABASE_NAME, process.env.MONGO_GUILD_CONFIGS_COLLECTION_NAME, [
                new_guild_config,
            ]);
        } catch (error) {
            console.trace(error);
            throw new Error(`GuildConfigsManager.create(): failed to create new guild_config for ${guild_id} in the database`);
        }

        GuildConfigsManager.cache.set(guild_id, new_guild_config);

        return new_guild_config;
    }

    /**
     * @param {GuildId} guild_id
     * @param {Object.<string, any>} partial_guild_config
     * @return {Promise<GuildConfig>
     */
    static async update(guild_id, partial_guild_config={}) {
        if (typeof guild_id !== 'string') throw new TypeError('guild_id must be a string');
        if (typeof partial_guild_config !== 'object') throw new TypeError('partial_guild_config must be an object');

        const guild_config = await GuildConfigsManager.fetch(guild_id, true);

        const guild_config_template = GuildConfigsManager.guild_config_template;

        const updated_guild_config = {
            ...guild_config_template,
            ...guild_config,
            ...partial_guild_config,
        };

        try {
            await go_mongo_db.update(process.env.MONGO_DATABASE_NAME, process.env.MONGO_GUILD_CONFIGS_COLLECTION_NAME, {
                'guild_id': guild_id,
            }, {
                $set: {
                    ...updated_guild_config,
                },
            }, {
                upsert: true,
            });
        } catch (error) {
            console.trace(error);
            throw new Error(`GuildConfigsManager.create(): failed to update guild_config for ${guild_id} in the database`);
        }

        GuildConfigsManager.cache.set(guild_id, updated_guild_config);

        return updated_guild_config;
    }

    /**
     * @param {GuildId} guild_id
     * @return {Promise<void>}
     */
    static async remove(guild_id) {
        if (typeof guild_id !== 'string') throw new TypeError('guild_id must be a string');

        try {
            await go_mongo_db.remove(process.env.MONGO_DATABASE_NAME, process.env.MONGO_GUILD_CONFIGS_COLLECTION_NAME, {
                'guild_id': guild_id,
            });
        } catch (error) {
            console.trace(error);
            throw new Error(`GuildConfigsManager.remove(): failed to remove guild_config for ${guild_id} from the database`);
        }

        GuildConfigsManager.cache.delete(guild_id);
    }
}

//------------------------------------------------------------//

module.exports = {
    GuildConfigsManager,
};
