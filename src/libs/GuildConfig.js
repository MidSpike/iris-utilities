'use strict';

const { DataConfigsManager } = require('./base/DataConfigsManager.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for interacting with Guild Configs
 */
class GuildConfigsManager extends DataConfigsManager {}

module.exports = {
    GuildConfigsManager,
};
