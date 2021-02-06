'use strict';

const { DataConfigsManager } = require('./base/DataConfigsManager.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for interacting with blacklisted guilds
 */
class BlacklistedGuildsManager extends DataConfigsManager {}

module.exports = {
    BlacklistedGuildsManager,
};
