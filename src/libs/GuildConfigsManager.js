'use strict';

const { DataConfigsManager } = require('./base/DataConfigsManager.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for interacting with guild configs
 */
class GuildConfigsManager extends DataConfigsManager {}

module.exports = {
    GuildConfigsManager,
};
