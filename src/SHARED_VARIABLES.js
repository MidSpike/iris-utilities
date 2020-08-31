'use strict';

//---------------------------------------------------------------------------------------------------------------//

/**
 * This file will contain variables that should be accessible to all
 * scopes of the bot process, excluding the bot api server process.
 */

//---------------------------------------------------------------------------------------------------------------//

const lockdown_mode = false;
const restarting_bot = false;

const disBotServers = {/*
    'guild_id': {
        queue_manager,
        volume_manager,
        audio_controller,
        dispatcher,
    }
*/};

module.exports = {
    lockdown_mode,
    restarting_bot,
    disBotServers,
};
