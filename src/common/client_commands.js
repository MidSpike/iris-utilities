'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

//------------------------------------------------------------//

/**
 * @typedef {{
 *  command_args: string[],
 *  command: ClientCommand,
 * }} ClientCommandHandlerOptions
 * 
 * @typedef {string} ClientCommandName
 * @typedef {string} ClientCommandDescription
 * @typedef {Discord.ApplicationCommandOptionData[]} ClientCommandOptions
 * @typedef {Discord.PermissionResolvable[]} ClientCommandPermissions
 * @typedef {'ALL_CHANNELS'|'GUILD_CHANNELS'|'DM_CHANNELS'} ClientCommandContext
 * @typedef {ClientCommandContext[]} ClientCommandContexts
 * @typedef {(discord_client: Discord.Client, command_interaction: Discord.CommandInteraction) => Promise<void>} ClientCommandHandler
 * 
 * @typedef {{
 *  name: ClientCommandName,
 *  description: ClientCommandDescription,
 *  permissions: ClientCommandPermissions,
 *  contexts: ClientCommandContexts,
 *  handler: ClientCommandHandler,
 * }} ClientCommandConstructorOptions
 */

//------------------------------------------------------------//

class ClientCommand {
    static permission_levels = {
        PUBLIC: 1,
        DONATOR: 2,
        GUILD_MOD: 3,
        GUILD_ADMIN: 4,
        GUILD_OWNER: 5,
        BOT_SUPER: 6,
    };

    static categories = {
        PUBLIC: {
            name: 'Public',
            description: 'Commands that can be used in any channel.',
            required_permission_levels: [
                ClientCommand.permission_levels.PUBLIC,
            ],
        },
        DONATOR: {
            name: 'Donator',
            description: 'Commands that can only be used by donators.',
            required_permission_levels: [
                ClientCommand.permission_levels.DONATOR,
            ],
        },
        GUILD_STAFF: {
            name: 'Guild Staff',
            description: 'Commands that can only be used by guild mods / admins / owner.',
            required_permission_levels: [
                ClientCommand.permission_levels.GUILD_MOD,
                ClientCommand.permission_levels.GUILD_ADMIN,
                ClientCommand.permission_levels.GUILD_OWNER,
            ],
        },
        SUPER: {
            name: 'Super',
            description: 'Commands that can only be used by bot admins / owner.',
            required_permission_levels: [
                ClientCommand.permission_levels.BOT_SUPER
            ],
        },
    };

    #name;
    #description;
    #options;
    #permissions;
    #contexts;
    #handler;

    /**
     * @param {ClientCommandConstructorOptions} opts
     */
    constructor(opts) {
        this.#name = opts.name;
        this.#description = opts.description;
        this.#options = opts.options;
        this.#permissions = opts.permissions;
        this.#contexts = opts.contexts;
        this.#handler = opts.handler;
    }

    /** @type {ClientCommandName} */
    get name() {
        return this.#name;
    }

    /** @type {ClientCommandDescription} */
    get description() {
        return this.#description;
    }

    /** @type {ClientCommandOptions} */
    get options() {
        return this.#options;
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
    async handler(discord_client, command_interaction) {
        return this.#handler(discord_client, command_interaction);
    }
}

//------------------------------------------------------------//

class ClientCommandManager {
    /**
     * @type {Discord.Collection<ClientCommandName, ClientCommand>}
     */
    static commands = new Discord.Collection();

    /**
     * @param {Discord.Client} discord_client
     * @param {ClientCommand} command
     */
    static async registerGlobalCommand(discord_client, command) {
        const command_is_registered = discord_client.application.commands.cache.find(cmd => cmd.name === command?.name);
        if (!command_is_registered) {
            await discord_client.application.commands.create({
                name: command.name,
                description: command.description,
                options: command.options,
                defaultPermission: true,
            });
        }

        ClientCommandManager.commands.set(command.name, command);
    }
}

//------------------------------------------------------------//

module.exports = {
    ClientCommand,
    ClientCommandManager,
};
