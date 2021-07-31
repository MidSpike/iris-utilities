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
 * @typedef {(discord_client: Discord.Client, command_interaction: Discord.CommandInteraction) => Promise<unknown>} ClientCommandHandler
 * 
 * @typedef {{
 *  name: ClientCommandName,
 *  description: ClientCommandDescription,
 *  permissions: ClientCommandPermissions,
 *  context: ClientCommandContext,
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
    #context;
    #handler;

    /**
     * @param {ClientCommandConstructorOptions} opts
     */
    constructor(opts) {
        this.#name = opts.name;
        this.#description = opts.description;
        this.#options = opts.options;
        this.#permissions = opts.permissions;
        this.#context = opts.context;
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

    /** @type {ClientCommandContext} */
    get context() {
        return this.#context;
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.CommandInteraction} command_interaction
     * @returns {Promise<unknown>}
     */
    async handler(discord_client, command_interaction) {
        /* validate the command context */
        const interaction_originated_from_guild = !!command_interaction.guildId;
        if (interaction_originated_from_guild && this.context === 'DM_CHANNELS') {
            return command_interaction.reply('This command can only be used in a dm channel.');
        }
        if (!interaction_originated_from_guild && this.context === 'GUILD_CHANNELS') {
            return command_interaction.reply('This command can only be used in a guild channel.');
        }

        /* validate the command permissions */
        const command_permissions = this.permissions;
        const channel = await discord_client.channels.fetch(command_interaction.channelId);
        if (channel.isText() && channel.type !== 'DM') {
            const bot_permissions = channel.permissionsFor(discord_client.user.id);
            const missing_permissions = command_permissions.filter(command_permission => !bot_permissions.has(command_permission));
            if (missing_permissions.length > 0) {
                const mapped_missing_permission_flags = missing_permissions.map(permission => Object.entries(Discord.Permissions.FLAGS).find(([ _, perm ]) => perm === permission)?.[0]);
                return command_interaction.reply('In order to execute this command, I need you to grant me the following permission(s):\n>>> ' + mapped_missing_permission_flags.join('\n'));
            }
        }

        /* run the command handler */
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
