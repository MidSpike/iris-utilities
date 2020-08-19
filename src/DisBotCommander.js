'use strict';

/**
 * Parses message_content for the command used
 * @param {String} message_content 
 * @returns {String} discord_command including the comman_prefix
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
 */
class DisBotCommand {
    static access_levels = {
        GLOBAL_USER:1,
        // GLOBAL_DONATOR:250, // reserved for potential future usage
        GUILD_MOD:500,
        GUILD_ADMIN:1_000,
        BOT_SUPER:5_000,
        BOT_OWNER:10_000,
    };
    #cmd_template = {
        name:'',
        category:'',
        description:'',
        aliases:[],
        access_level:DisBotCommand.access_levels.GLOBAL_USER,
        executor(Discord, client, message, opts={}) {}
    };
    /**
     * Arguments is an object to allow for easy future expansion
     * @param {Object} cmd an object that must contain the properties of this.#cmd_template
     */
    constructor(cmd={}) {
        const _cmd = {
            ...this.#cmd_template,
            ...cmd
        };

        // type checks
        if (typeof _cmd.name !== 'string' || _cmd.name.length < 1) throw new Error('`name` must be a valid string!');
        if (typeof _cmd.category !== 'string' || _cmd.category.length < 1) throw new Error('`category` must be a valid string!');
        if (typeof _cmd.description !== 'string' || _cmd.description.length < 1) throw new Error('`description` must be a valid string!');
        if (!Array.isArray(_cmd.aliases) || _cmd.aliases.length < 1) throw new Error('`aliases` must be a valid array!');
        if (isNaN(_cmd.access_level)) throw new Error('`access_level` must be a valid number!');
        if (typeof _cmd.executor !== 'function') throw new Error('`executor` must be a valid function!');

        // validation checks
        if (!Object.values(DisBotCommand.access_levels).includes(_cmd.access_level)) throw new Error('`access_level` must be from DisBotCommand.access_levels!');

        this.name = _cmd.name;
        this.category = _cmd.category;
        this.description = _cmd.description;
        this.aliases = _cmd.aliases;
        this.access_level = _cmd.access_level;
        this.executor = _cmd.executor;
    }
    /**
     * Executes the command
     * @param {Client} client 
     * @param {Message} message 
     * @param {Object} opts 
     */
    execute(Discord, client, message, opts={}) {
        if (!Discord) throw new Error('`Discord` must be passed!');
        if (!client) throw new Error('`client` must be passed!');
        if (!message) throw new Error('`message` must be passed!');
        if (!opts) throw new Error('`opts` must be passed!');
        return this.executor(Discord, client, message, opts);
    }
}

/**
 * Static class instance to keep track of all commands and register them
 */
class DisBotCommander {
    static categories = {
        HELP:'Help Commands',
        INFO:'Bot Info',
        MUSIC_PLAYBACK:'YouTube Music And More',
        MUSIC_CONTROLS:'Music Controls',
        // MUSIC_LEAVE:'Disconnect',
        FUN:'Fun Stuff',
        UTILITIES:'Utilities',
        ADMINISTRATOR:'Administrative Powers',
        GUILD_SETTINGS:'Server Management',
        SUPER_PEOPLE:'Super People Commands',
        BOT_OWNER:'Bot Owner Commands',
        HIDDEN:'Hidden Commands',
    };
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
