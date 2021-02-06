'use strict';

const { DataConfigsManager } = require('./base/DataConfigsManager.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Creates an interface for interacting with blacklisted users
 */
class BlacklistedUsersManager extends DataConfigsManager {}

module.exports = {
    BlacklistedUsersManager,
};
