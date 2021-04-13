'use strict';

//---------------------------------------------------------------------------------------------------------------//

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const { object_sort } = require('../../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * @typedef {String} DataConfigId 
 * @typedef {Object.<string, any>} DataConfig 
 * @typedef {Collection<DataConfigId, DataConfig>} DataConfigs 
 */

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for interacting with Data Configs
 * @param {String} configs_file_relative_path a relative file path to the `.json` file from `process.cwd()`
 */
class DataConfigsManager {
    /** @type {String} the absolute file path to the data configs file */
    #configs_file_path;

    /** @type {DataConfigs} all data configs that are stored in memory */
    #configs_in_memory;

    constructor(configs_file_relative_path) {
        if (typeof configs_file_relative_path !== 'string') throw new TypeError('\`configs_file_relative_path\` must be a string!');

        /* set `this.#configs_file_path` to the absolute file path */
        this.#configs_file_path = path.join(process.cwd(), configs_file_relative_path);

        /* create the configs file if it does not already exist */
        if (!fs.existsSync(this.#configs_file_path)) {
            fs.writeFileSync(this.#configs_file_path, JSON.stringify([], null, 2));
        }

        /* retrieve configs from storage as: Array<Array<data_config_id='', data_config={}>> */
        const configs_from_storage = JSON.parse(fs.readFileSync(this.#configs_file_path));

        /* prepare the configs in memory to be stored as a `Discord.Collection` */
        this.#configs_in_memory = new Collection(configs_from_storage);

        /* automatically save the configs from memory to storage every 30 minutes */
        setInterval(() => {
            this.saveConfigs();
        }, 1000 * 60 * 30);
    }

    /**
     * Retrieves all data configs
     * @returns {DataConfigs} all data configs
     * @deprecated
     */
    get configs() {
        return this.#configs_in_memory;
    }

    /**
     * Retrieves all data configs
     * @returns {DataConfigs} all data configs
     */
    async fetchAllConfigs() {
        return this.#configs_in_memory;
    }

    /**
     * Retrieves the config of the specified data config
     * @param {DataConfigId} data_config_id 
     * @returns {DataConfig} a key:value data config in the form of an object literal
     */
    async fetchConfig(data_config_id) {
        return this.#configs_in_memory.get(data_config_id) ?? {};
    }

    /**
     * Determines whether the specified data config exists
     * @param {DataConfigId} data_config_id 
     * @returns {Boolean} 
     */
    async hasConfig(data_config_id) {
        return this.#configs_in_memory.has(data_config_id);
    }

    /**
     * Updates the specified data config
     * @param {DataConfigId} data_config_id 
     * @param {DataConfig} partial_config_data a key:value partial data config in the form of an object literal
     * @param {Boolean} keep_old_config_data keep existing config entries or start from scratch
     * @returns {DataConfigsManager} this DataConfigsManager
     */
    async updateConfig(data_config_id, partial_config_data={}, keep_old_config_data=true) {
        const old_config_data = await this.fetchConfig(data_config_id);

        const new_config_data = {
            ...(keep_old_config_data ? old_config_data : {}),
            ...partial_config_data,
        };

        this.#configs_in_memory.set(data_config_id, object_sort(new_config_data));

        return this;
    }

    /**
     * Removes the specified data config
     * @param {DataConfigId} data_config_id 
     * @returns {DataConfigsManager} this DataConfigsManager
     */
    async removeConfig(data_config_id) {
        this.#configs_in_memory.delete(data_config_id);
        return this;
    }

    /**
     * Writes all of the data configs to the data configs file
     * @returns {DataConfigsManager} this DataConfigsManager
     */
    async saveConfigs() {
        const data_config_filename = path.basename(this.#configs_file_path);
        console.time(`Saving data configs to storage as ${data_config_filename}`);
        fs.writeFileSync(this.#configs_file_path, JSON.stringify(Array.from(this.#configs_in_memory), null, 2));
        console.timeEnd(`Saving data configs to storage as ${data_config_filename}`);
        return this;
    }
}

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    DataConfigsManager,
};
