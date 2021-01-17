'use strict';

const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');

const { client } = require('./discord_client.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Registers all client events files by recursively looking
 * for all `.js` files in the `./src/events/` directory.
 */
function registerDisBotEvents() {
    console.info('----------------------------------------------------------------------------------------------------------------');
    try {
        const event_files_directory_path = path.join(process.cwd(), './src/events/');
        const event_files = recursiveReadDirectory(event_files_directory_path).filter(file => file.endsWith('.js'));
        for (const event_file of event_files) {
            console.info(`Registering Event: ${event_file}`);
            const event_file_path = path.join(process.cwd(), './src/events/', event_file);
            delete require.cache[event_file_path]; // force require the event file
            const event_to_register = require(event_file_path);
            const { event_name, callback } = event_to_register;
            client.on(event_name, callback);
        }
    } catch (error) {
        console.trace('An error occurred while registering the events:', error);
    }
    console.info('----------------------------------------------------------------------------------------------------------------');
}

module.exports = {
    registerDisBotEvents,
};
