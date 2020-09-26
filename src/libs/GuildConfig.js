'use strict';

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const { object_sort } = require('../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

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

        /* automatically save the configs from memory to storage every minute */
        setInterval(() => {
            this.saveConfigs();
        }, 1000 * 60 * 1);
    }

    /**
     * Retrieves all guild configs
     * @returns {Collection<GuildId, GuildConfig>} all guild configs
     */
    get configs() {
        return this.#configs_in_memory;
    }

    /**
     * Retrieves the config of the specified guild
     * @param {String} guild_id 
     * @returns {GuildConfig} a key:value guild config in the form of an object literal
     */
    async fetchConfig(guild_id) {
        return this.#configs_in_memory.get(guild_id) ?? {};
    }

    /**
     * Updates the config of the specified guild
     * @param {String} guild_id 
     * @param {GuildConfig} new_config_data a key:value guild config in the form of an object literal
     * @param {Boolean} keep_old_config_data keep existing config entries or start from scratch
     * @returns {GuildConfigsManager} this GuildConfigsManager
     */
    async updateConfig(guild_id, new_config_data={}, keep_old_config_data=true) {
        const old_config_data = await this.fetchConfig(guild_id);
        this.#configs_in_memory.set(guild_id, object_sort({
            ...(keep_old_config_data ? old_config_data : {}),
            ...new_config_data
        }));
        return this;
    }

    /**
     * Removes the config of the specified guild
     * @param {*} guild_id 
     * @returns {GuildConfigsManager} this GuildConfigsManager
     */
    async removeConfig(guild_id) {
        this.#configs_in_memory.delete(guild_id)
        return this;
    }

    /**
     * Writes all of the guild configs to the guild configs file
     * @returns {GuildConfigsManager} this GuildConfigsManager
     */
    async saveConfigs() {
        console.time(`Saving guild configs to storage!`);
        fs.writeFileSync(this.#configs_file, JSON.stringify(Array.from(this.#configs_in_memory), null, 2));
        console.timeEnd(`Saving guild configs to storage!`);
        return this;
    }
}

module.exports = {
    GuildConfigsManager,
};
