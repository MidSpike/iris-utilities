'use strict';

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const { object_sort } = require('../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_guild_configs_file = path.join(process.cwd(), process.env.BOT_GUILD_CONFIGS_FILE);

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for accessing Guild Config Information and modifying it
 * @param {String} guild_id 
 * @returns {GuildConfigManipulator} 
 */
class GuildConfigManipulator {
    #configs_file = bot_guild_configs_file;
    constructor(guild_id) {
        this.guild_id = guild_id;
    }
    get configs() {
        return JSON.parse(fs.readFileSync(this.#configs_file)) || {};
    }
    get config() {
        return this.configs[this.guild_id] || {};
    }
    /**
     * A non-complete object containing the guild config data changes to propagate to the config file
     * @param {Object} new_config_data 
     * @returns {GuildConfigManipulator} 
     */
    async modifyConfig(new_config_data={}) {
        /* this will make a new config if it doesn't already exist */
        fs.writeFileSync(this.#configs_file, JSON.stringify({
            ...this.configs,
            [this.guild_id]:object_sort({
                ...this.config,
                ...new_config_data
            })
        }, null, 2));
        return this;
    }
}

/**
 * Creates an interface for interacting with Guild Configs
 * @param {String} configs_file_relative_path a relative file path to the `.json` file from `process.cwd()`
 */
class GuildConfigsManager {
    #configs_file;
    #configs_in_memory;

    constructor(configs_file_relative_path='') {
        this.#configs_file = path.join(process.cwd(), configs_file_relative_path);

        /* retrieve configs from storage as: Array<Array<guild_id='', guild_config_data={}>> */
        const configs_from_storage = JSON.parse(fs.readFileSync(this.#configs_file));

        /* prepare the configs in memory to be stored as a `Discord.Collection` */
        this.#configs_in_memory = new Collection(configs_from_storage);

        /* automatically save the configs from memory to storage every 5 minutes */
        setInterval(() => {
            this.saveConfigs();
        }, 1000 * 60 * 5);
    }

    get configs() {
        return this.#configs_in_memory;
    }

    async fetchConfig(guild_id) {
        return this.#configs_in_memory.get(guild_id) ?? {};
    }

    async updateConfig(guild_id, new_config_data={}, keep_old_config_data=true) {
        const old_config_data = await this.fetchConfig(guild_id);
        return this.#configs_in_memory.set(guild_id, object_sort({
            ...(keep_old_config_data ? old_config_data : {}),
            ...new_config_data
        }));
    }

    async removeConfig(guild_id) {
        return this.#configs_in_memory.delete(guild_id);
    }

    async saveConfigs() {
        console.time(`Saving guild configs to storage!`);
        fs.writeFileSync(this.#configs_file, JSON.stringify(Array.from(this.#configs_in_memory), null, 2));
        console.timeEnd(`Saving guild configs to storage!`);
    }
}

module.exports = {
    GuildConfigsManager,
};
