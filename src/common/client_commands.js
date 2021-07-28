'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

//------------------------------------------------------------//

class ClientCommandManager {
    /**
     * @type {Discord.Collection<ClientCommandName, ClientCommand>}
     */
    static commands = new Discord.Collection();

    static command_permission_levels = {
        PUBLIC: 1,
        DONATOR: 2,
        GUILD_MOD: 3,
        GUILD_ADMIN: 4,
        GUILD_OWNER: 5,
        BOT_MOD: 6,
        BOT_ADMIN: 7,
        BOT_OWNER: 8,
    };

    static command_categories = {
        PUBLIC: {
            name: 'Public',
            description: 'Commands that can be used in any channel.',
            permission_level: ClientCommandManager.command_permission_levels.PUBLIC,
        },
        DONATOR: {
            name: 'Donator',
            description: 'Commands that can only be used by donators.',
            permission_level: ClientCommandManager.command_permission_levels.DONATOR,
        },
        GUILD_MOD: {
            name: 'Guild Mod',
            description: 'Commands that can only be used by guild mods.',
            permission_level: ClientCommandManager.command_permission_levels.GUILD_MOD,
        },
        GUILD_ADMIN: {
            name: 'Guild Admin',
            description: 'Commands that can only be used by guild admins.',
            permission_level: ClientCommandManager.command_permission_levels.GUILD_ADMIN,
        },
        GUILD_OWNER: {
            name: 'Guild Owner',
            description: 'Commands that can only be used by guild owners.',
            permission_level: ClientCommandManager.command_permission_levels.GUILD_OWNER,
        },
        BOT_MOD: {
            name: 'Bot Mod',
            description: 'Commands that can only be used by bot mods.',
            permission_level: ClientCommandManager.command_permission_levels.BOT_MOD,
        },
        BOT_ADMIN: {
            name: 'Bot Admin',
            description: 'Commands that can only be used by bot admins.',
            permission_level: ClientCommandManager.command_permission_levels.BOT_ADMIN,
        },
        BOT_OWNER: {
            name: 'Bot Owner',
            description: 'Commands that can only be used by bot owners.',
            permission_level: ClientCommandManager.command_permission_levels.BOT_OWNER,
        },
    };

    /**
     * @param {ClientCommand} command
     */
    static async loadCommand(command) {
        ClientCommandManager.commands.set(command.name, command);
    }
}

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
 * @typedef {'ALL_CHANNELS'|'GUILD_CHANNELS'|'DM_CHANNELS'} ClientCommandContext
 * @typedef {ClientCommandContext[]} ClientCommandContexts
 * @typedef {(message: Discord.Message, opts: ClientCommandHandlerOptions) => Promise<void>} ClientCommandHandler
 * 
 * @typedef {{
 *  name: ClientCommandName,
 *  aliases: ClientCommandAliases,
 *  description: ClientCommandDescription,
 *  permissions: ClientCommandPermissions,
 *  contexts: ClientCommandContexts,
 *  handler: ClientCommandHandler,
 * }} ClientCommandOptions
 */

//------------------------------------------------------------//

class ClientCommand {
    #name;
    #aliases;
    #description;
    #permissions;
    #contexts;
    #handler;

    /**
     * @param {ClientCommandOptions} opts
     */
    constructor(opts) {
        this.#name = opts.name;
        this.#aliases = opts.aliases;
        this.#description = opts.description;
        this.#permissions = opts.permissions;
        this.#contexts = opts.contexts;
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

    /** @type {ClientCommandContexts} */
    get contexts() {
        return this.#contexts;
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
    const potential_command = ClientCommandManager.commands.find(command => command.aliases.includes(potential_command_name));

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
    ClientCommandManager,
    ClientCommand,
};
