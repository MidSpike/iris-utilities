'use strict';

const { Discord } = require('./bot.js');

//---------------------------------------------------------------------------------------------------------------//

/**
 * Parses message_content for the command used
 * @param {String} message_content 
 * @returns {String} the `discord_command` including the `command_prefix`
 */
function getDiscordCommand(message_content) {
    if (typeof message_content !== 'string') throw new TypeError('`message_content` must be a valid string!');
    return message_content.split(/\s/g).filter(item => item !== '')[0].toLowerCase();
}

/**
 * Gets an array of command arguments based off of seperating the message_content with spaces
 * @param {String} message_content 
 * @returns {Array<String>} the `discord_command` `command_args`
 */
function getDiscordCommandArgs(message_content) {
    if (typeof message_content !== 'string') throw new TypeError('`message_content` must be a valid string!');
    return message_content.split(/\s/g).filter(item => item !== '').slice(1);
}

/**
 * Creates an intance of a command that is usable by this bot
 */
class DisBotCommand {
    static access_levels = {
        GLOBAL_USER: 1,
        // GLOBAL_DONATOR: 250, // reserved for potential future usage
        GUILD_MOD: 500,
        GUILD_ADMIN: 1_000,
        BOT_SUPER: 5_000,
        BOT_OWNER: 10_000
    };
    #cmd_template = {
        name: '',
        category: '',
        weight: 9999,
        description: '',
        aliases: [],
        access_level: DisBotCommand.access_levels.GLOBAL_USER,
        executor(Discord, client, message, opts={}) {}
    };
    /**
     * The arguments are an object to allow for easy future expansion
     * @param {Object} cmd an object that must be composed from the properties of this.#cmd_template.
     */
    constructor(cmd={}) {
        const _cmd = {
            ...this.#cmd_template,
            ...cmd
        };

        /* type checks and basic validation checks */
        if (typeof _cmd.name !== 'string' || _cmd.name.length < 1) throw new TypeError('`name` must be a valid string!');
        if (typeof _cmd.category !== 'string' || _cmd.category.length < 1) throw new TypeError('`category` must be a valid string!');
        if (isNaN(_cmd.weight) || _cmd.weight < 1) throw new TypeError('`weight` must be a valid number above `0`!');
        if (typeof _cmd.description !== 'string' || _cmd.description.length < 1) throw new TypeError('`description` must be a valid string!');
        if (!Array.isArray(_cmd.aliases) || _cmd.aliases.length < 1) throw new TypeError('`aliases` must be a valid array!');
        if (isNaN(_cmd.access_level)) throw new TypeError('`access_level` must be a valid number!');
        if (typeof _cmd.executor !== 'function') throw new TypeError('`executor` must be a valid function!');

        /* advanced validation checks */
        if (!Object.values(DisBotCommand.access_levels).includes(_cmd.access_level)) throw new TypeError('`access_level` must be from DisBotCommand.access_levels!');

        this.name = _cmd.name;
        this.category = _cmd.category;
        this.weight = _cmd.weight;
        this.description = _cmd.description;
        this.aliases = _cmd.aliases;
        this.access_level = _cmd.access_level;
        this.executor = _cmd.executor;
    }
    /**
     * Executes the command executor
     * @param {Discord} Discord 
     * @param {Client} client 
     * @param {Message} message 
     * @param {Object} opts 
     * @returns {unknown} whatever is returned from the executed command
     */
    async execute(Discord, client, message, opts={}) {
        if (!Discord) throw new Error('`Discord` must be passed to command.execute()!');
        if (!client) throw new Error('`client` must be passed to command.execute()!');
        if (!message) throw new Error('`message` must be passed to command.execute()!');
        if (!opts) throw new Error('`opts` must be passed to command.execute()!');
        return await this.executor(Discord, client, message, opts);
    }
}

/**
 * Static class instance to keep track of all commands and register them
 */
class DisBotCommander {
    static categories = {
        HELP: 'Help Commands',
        INFO: 'Bot Info',
        MUSIC: 'YouTube, Music Controls, And More',
        FUN: 'Fun Stuff',
        UTILITIES: 'Utilities',
        ADMINISTRATOR: 'Administrative Powers',
        GUILD_SETTINGS: 'Server Management',
        SUPER_PEOPLE: 'Super People Commands',
        BOT_OWNER: 'Bot Owner Commands',
        HIDDEN: 'Hidden Commands',
    };

    static #commands = new Discord.Collection();

    /**
     * @returns a `Discord.Collection` of commands
     */
    static get commands() {
        return this.#commands;
    }

    /**
     * Registers a command to the DisBotCommander.commands
     * @param {DisBotCommand} command 
     */
    static registerCommand(command) {
        if (command instanceof DisBotCommand) {
            this.#commands.set(command.name, command);
        } else {
            throw new TypeError(`'command' should be an instance of the DisBotCommand type!`);
        }
    }
}

module.exports = {
    getDiscordCommand,
    getDiscordCommandArgs,
    DisBotCommand,
    DisBotCommander,
};
