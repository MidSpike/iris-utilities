'use strict';

/**
 * Parses message_content for the command used
 * @param {String} message_content 
 * @returns {String} discord_command
 */
function getDiscordCommand(message_content) {
    return message_content.split(/\s/g).filter(item => item !== '')[0].toLowerCase();
}

/**
 * Gets an array of command arguments based off of seperating the message_content with spaces
 * @param {*} message_content 
 * @returns {Array<String>}
 */
function getDiscordCommandArgs(message_content) {
    return message_content.split(/\s/g).filter(item => item !== '').slice(1);
}

/**
 * Creates an intance of a command that is usable by this bot
 * @param {String} name Uppercase of module filename without the extension
 * @param {Array<String>} aliases aliases that can be used to trigger the command
 * @param {Function} executor the command handler
 * @returns {this}
 */
class DisBotCommand {
    constructor(name='', aliases=[], executor=(client, message, opts={})=>{}) {
        if (typeof name !== 'string' || name.length < 1) throw new Error('`name` must be a valid string!');
        if (!Array.isArray(aliases) || aliases.length < 1) throw new Error('`desciption` must be a valid array!');
        if (typeof executor !== 'function') throw new Error('`executor` must be a valid function!');
        this.name = name;
        this.aliases = aliases;
        this.executor = executor;
    }
    /**
     * Executes the command
     * @param {Client} client 
     * @param {Message} message 
     * @param {Object} opts 
     */
    execute(client, message, opts={}) {
        return this.executor(client, message, opts);
    }
}

/**
 * Static class instance to keep track of all commands and register them
 */
class DisBotCommander {
    static #commands = [];
    static get commands() {
        return this.#commands;
    }
    static registerCommand(command) {
        if (command instanceof DisBotCommand) {
            this.#commands = this.commands.filter(cmd => cmd.name !== command.name); // Allow commands to be replaced
            this.#commands.push(command);
        } else {
            throw new TypeError(`'command' should be an instance of the DisBotCommand type!`);
        }
    }
}

module.exports = {
    getDiscordCommand,
    getDiscordCommandArgs,
    DisBotCommand,
    DisBotCommander
};
