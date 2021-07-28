'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

//------------------------------------------------------------//

const client_commands = new Discord.Collection();

//------------------------------------------------------------//

/**
 * @typedef {{
 *  command_prefix: string,
 *  command_args: string[],
 *  command: ClientCommand,
 * }} ClientCommandHandlerOptions
 * 
 * @typedef {string} ClientCommandName
 * @typedef {string[]} ClientCommandAliases
 * @typedef {string} ClientCommandDescription
 * @typedef {Discord.PermissionResolvable[]} ClientCommandPermissions
 * @typedef {(message: Discord.Message, opts: ClientCommandHandlerOptions) => Promise<void>} ClientCommandHandler
 * 
 * @typedef {{
 *  name: ClientCommandName,
 *  aliases: ClientCommandAliases,
 *  description: ClientCommandDescription,
 *  permissions: ClientCommandPermissions,
 *  handler: ClientCommandHandler,
 * }} ClientCommandOptions
 */

//------------------------------------------------------------//

class ClientCommand {
    /**
     * @param {ClientCommandOptions} opts
     */
    constructor(opts) {
        this.#name = opts.name;
        this.#aliases = opts.aliases;
        this.#description = opts.description;
        this.#permissions = opts.permissions;
        this.#handler = opts.handler;
    }

    /** @type {ClientCommandName} */
    get name() {
        return this.#name;
    }

    /** @type {ClientCommandAliases} */
    get aliases() {
        return this.#aliases;
    }

    /** @type {ClientCommandDescription} */
    get description() {
        return this.#description;
    }

    /** @type {ClientCommandPermissions} */
    get permissions() {
        return this.#permissions;
    }

    /** @type {ClientCommandHandler} */
    async handler(message, opts) {
        return this.#handler(message, opts);
    }
}

//------------------------------------------------------------//

/**
 * @typedef {{
 *  command: ClientCommand,
 *  command_args: string[],
 *  command_prefix: string,
 * }} ParsedCommandFromMessageContent
 */

//------------------------------------------------------------//

/**
 * @param {string} message_content
 * @param {string} guild_command_prefix
 * @returns {ParsedCommandFromMessageContent?}
 */
function parseCommandFromMessageContent(message_content, guild_command_prefix) {
    if (!message_content.startsWith(guild_command_prefix)) return null;

    const message_args = message_content.replace(guild_command_prefix, '').split(/\s+/gi);

    const potential_command_name = `${message_args[0]}`.toLowerCase().trim();

    /** @type {ClientCommand?} */
    const potential_command = client_commands.find(command => command.aliases.includes(potential_command_name));

    if (!potential_command) return null;

    return {
        command: potential_command,
        command_args: message_args.slice(1),
        command_prefix: guild_command_prefix,
    };
}

//------------------------------------------------------------//

module.exports = {
    parseCommandFromMessageContent,
    ClientCommand,
    client_commands,
};
