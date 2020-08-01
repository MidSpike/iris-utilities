require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { object_sort } = require('../utilities.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_guild_configs_file = path.join(process.cwd(), process.env.BOT_GUILD_CONFIGS_FILE);

//---------------------------------------------------------------------------------------------------------------//

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
    async modifyConfig(new_config_data={}) {// This will make a new config if none is found
        fs.writeFileSync(this.#configs_file, JSON.stringify({
            ...this.configs,
            [this.guild_id]: object_sort({
                ...this.config,
                ...new_config_data
            })
        }, null, 4));
        return this;
    }
}

module.exports = {
    GuildConfigManipulator,
};
