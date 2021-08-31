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
 * @typedef {Discord.ApplicationCommandType} ClientCommandType
 * @typedef {string} ClientCommandName
 * @typedef {string} ClientCommandDescription
 * @typedef {{
 *  id: string,
 *  name: string,
 *  description: string,
 *  required_permission_levels: number[],
 * }} ClientCommandCategory
 * @typedef {Discord.ApplicationCommandOptionData[]} ClientCommandOptions
 * @typedef {Discord.PermissionResolvable[]} ClientCommandPermissions
 * @typedef {'GUILD_COMMAND'|'GLOBAL_COMMAND'} ClientCommandContext
 * @typedef {(discord_client: Discord.Client, interaction: Discord.Interaction) => Promise<unknown>} ClientCommandHandler
 * 
 * @typedef {{
 *  type: ClientCommandType,
 *  name: ClientCommandName,
 *  description: ClientCommandDescription,
 *  category: ClientCommandCategory,
 *  permissions: ClientCommandPermissions,
 *  context: ClientCommandContext,
 *  handler: ClientCommandHandler,
 * }} ClientCommandConstructorOptions
 */

//------------------------------------------------------------//

class ClientCommand {
    /** @type {Object.<string, number>} */
    static permission_levels = {
        PUBLIC: 1,
        GUILD_MOD: 2,
        GUILD_ADMIN: 3,
        GUILD_OWNER: 4,
        BOT_SUPER: 5,
    };

    /** @type {Discord.Collection<string, ClientCommandCategory>} */
    static categories = new Discord.Collection([
        {
            id: 'HELP_AND_INFORMATION',
            name: 'Help And Information',
            description: 'n/a',
            required_permission_levels: [
                ClientCommand.permission_levels.PUBLIC,
            ],
        }, {
            id: 'MUSIC_CONTROLS',
            name: 'Music Controls',
            description: 'n/a',
            required_permission_levels: [
                ClientCommand.permission_levels.PUBLIC,
            ],
        }, {
            id: 'FUN_STUFF',
            name: 'Fun Stuff',
            description: 'n/a',
            required_permission_levels: [
                ClientCommand.permission_levels.PUBLIC,
            ],
        }, {
            id: 'UTILITIES',
            name: 'Utilities',
            description: 'n/a',
            required_permission_levels: [
                ClientCommand.permission_levels.PUBLIC,
            ],
        }, {
            id: 'GUILD_STAFF',
            name: 'Guild Staff',
            description: 'Commands that can only be used by guild mods, admins, owner, and bot super.',
            required_permission_levels: [
                ClientCommand.permission_levels.GUILD_MOD,
                ClientCommand.permission_levels.GUILD_ADMIN,
                ClientCommand.permission_levels.GUILD_OWNER,
            ],
        }, {
            id: 'GUILD_CONFIGURATION',
            name: 'Guild Configuration',
            description: 'Commands that can only be used by guild admins, owner, and bot super.',
            required_permission_levels: [
                ClientCommand.permission_levels.GUILD_ADMIN,
                ClientCommand.permission_levels.GUILD_OWNER,
                ClientCommand.permission_levels.BOT_SUPER,
            ],
        }, {
            id: 'BOT_SUPER',
            name: 'Bot Super',
            description: 'Commands that can only be used by bot admins and owner.',
            required_permission_levels: [
                ClientCommand.permission_levels.BOT_SUPER,
            ],
        },
    ].map((command_category) => [command_category.id, command_category]));

    #type;
    #name;
    #description;
    #category;
    #options;
    #permissions;
    #context;
    #handler;

    /**
     * @param {ClientCommandConstructorOptions} opts
     */
    constructor(opts) {
        if (typeof opts.type !== 'string') throw new TypeError('opts.type must be a string');
        if (typeof opts.name !== 'string') throw new TypeError('opts.name must be a string');
        if (opts.description && typeof opts.description !== 'string') throw new TypeError('opts.description must be a string');
        if (opts.category && typeof opts.category !== 'object') throw new TypeError('opts.category must be an object');
        if (opts.options && typeof opts.options !== 'object') throw new TypeError('opts.options must be an object');
        if (typeof opts.permissions !== 'object') throw new TypeError('opts.permissions must be an object');
        if (typeof opts.context !== 'string') throw new TypeError('opts.context must be a string');
        if (typeof opts.handler !== 'function') throw new TypeError('opts.handler must be a function');

        this.#type = opts.type;
        this.#name = opts.name;
        this.#description = opts.description ?? null;
        this.#category = opts.category ?? null;
        this.#options = opts.options ?? null;
        this.#permissions = opts.permissions;
        this.#context = opts.context;
        this.#handler = opts.handler;
    }

    /** @type {ClientCommandType} */
    get type() {
        return this.#type;
    }

    /** @type {ClientCommandName} */
    get name() {
        return this.#name;
    }

    /** @type {ClientCommandDescription} */
    get description() {
        return this.#description;
    }

    /** @type {ClientCommandCategory} */
    get category() {
        return this.#category;
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
     * @param {Discord.Interaction} interaction
     * @returns {Promise<unknown>}
     */
    async handler(discord_client, interaction) {
        /* validate the command context execution environment */
        if (this.context !== 'ALL') {
            const interaction_originated_from_guild = !!interaction.guildId;
            if (!interaction_originated_from_guild && this.context === 'GUILDS') {
                return interaction.reply('This command can only be used inside of guilds.');
            }
            if (interaction_originated_from_guild && this.context === 'DMS') {
                return interaction.reply('This command can only be used inside of direct messages.');
            }
        }

        /* validate the command permissions */
        const command_permissions = this.permissions;
        const channel = await discord_client.channels.fetch(interaction.channelId);
        if (channel.isText() && channel.type !== 'DM') {
            const bot_permissions = channel.permissionsFor(discord_client.user.id);
            const missing_permissions = command_permissions.filter(command_permission => !bot_permissions.has(command_permission));
            if (missing_permissions.length > 0) {
                const mapped_missing_permission_flags = missing_permissions.map(permission => Object.entries(Discord.Permissions.FLAGS).find(([ _, perm ]) => perm === permission)?.[0]);
                return interaction.reply(`In order to execute this command, I need you to grant me the following permission(s):\n>>> ${mapped_missing_permission_flags.join('\n')}`);
            }
        }

        /* run the command handler */
        return this.#handler(discord_client, interaction);
    }
}

//------------------------------------------------------------//

class ClientCommandManager {
    /**
     * @type {Discord.Collection<ClientCommandName, ClientCommand>}
     */
    static commands = new Discord.Collection();

    /**
     * @param {ClientCommand} command
     */
    static async loadCommand(command) {
        ClientCommandManager.commands.set(command.name, command);
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Snowflake} guild_id
     */
    static async registerAllCommandsToGuild(discord_client, guild_id) {
        const guild = discord_client.guilds.resolve(guild_id);
        if (!guild) return;

        const guild_commands = await guild.commands.fetch();

        for (const command of ClientCommandManager.commands.values()) {
            if (command.context === 'DM_CHANNELS') return;

            const guild_command = guild_commands.find(guild_command => guild_command.name === command.name);

            if (!guild_command) {
                console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> registering command: ${command.name}; to guild: ${guild.id};`);
                await guild.commands.create({
                    type: command.type,
                    name: command.name,
                    description: command.description,
                    options: command.options,
                    defaultPermission: true,
                });
            }
            // uncomment to update existing commands
            // else {
            //     await guild.commands.edit(guild_command, {
            //         name: command.name,
            //         description: command.description,
            //         options: command.options,
            //         defaultPermission: true,
            //     });
            // }
        }

    }
}

//------------------------------------------------------------//

module.exports = {
    ClientCommand,
    ClientCommandManager,
};
