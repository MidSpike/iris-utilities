'use strict';

//------------------------------------------------------------//

const Discord = require('discord.js');

const { go_mongo_db } = require('../lib/go_mongo_db');

const { CustomEmbed } = require('./message');
const { GuildConfigsManager } = require('./guild_configs');

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
 *  required_access_level: number,
 * }} ClientCommandCategory
 * @typedef {Discord.ApplicationCommandOptionData[]} ClientCommandOptions
 * @typedef {Discord.PermissionResolvable[]} ClientCommandPermissions
 * @typedef {'GUILD_COMMAND'|'GLOBAL_COMMAND'} ClientCommandContext
 * @typedef {(discord_client: Discord.Client, interaction: Discord.Interaction) => Promise<unknown>} ClientCommandHandler
 * 
 * @typedef {{
 *  type: ClientCommandType,
 *  name: ClientCommandName,
 *  description?: ClientCommandDescription,
 *  category: ClientCommandCategory,
 *  options?: ClientCommandOptions,
 *  permissions: ClientCommandPermissions,
 *  context: ClientCommandContext,
 *  handler: ClientCommandHandler,
 * }} ClientCommandConstructorOptions
 */

//------------------------------------------------------------//

class ClientCommand {
    /** @type {Object.<string, number>} */
    static access_levels = {
        EVERYONE: 1,
        GUILD_STAFF: 2,
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
            required_access_level: ClientCommand.access_levels.EVERYONE,
        }, {
            id: 'MUSIC_CONTROLS',
            name: 'Music Controls',
            description: 'n/a',
            required_access_level: ClientCommand.access_levels.EVERYONE,
        }, {
            id: 'FUN_STUFF',
            name: 'Fun Stuff',
            description: 'n/a',
            required_access_level: ClientCommand.access_levels.EVERYONE,
        }, {
            id: 'UTILITIES',
            name: 'Utilities',
            description: 'n/a',
            required_access_level: ClientCommand.access_levels.EVERYONE,
        }, {
            id: 'GUILD_STAFF',
            name: 'Guild Staff',
            description: 'Commands for guild mods, guild admins, guild owner, and bot super.',
            required_access_level: ClientCommand.access_levels.GUILD_STAFF,
        }, {
            id: 'GUILD_ADMIN',
            name: 'Guild Admin',
            description: 'Commands for guild admins, guild owner, and bot super.',
            required_access_level: ClientCommand.access_levels.GUILD_ADMIN,
        }, {
            id: 'GUILD_OWNER',
            name: 'Guild Owner',
            description: 'Commands for the guild owner and bot super.',
            required_access_level: ClientCommand.access_levels.GUILD_OWNER,
        }, {
            id: 'BOT_SUPER',
            name: 'Bot Super',
            description: 'Commands for bot admins and the bot owner.',
            required_access_level: ClientCommand.access_levels.BOT_SUPER,
        },
    ].map((command_category) => ([ command_category.id, command_category ])));

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
        if (typeof opts.category !== 'object') throw new TypeError('opts.category must be an object');
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
                return interaction.reply(`In order to run this command, I need you to grant me the following permission(s):\n>>> ${mapped_missing_permission_flags.join('\n')}`);
            }
        }

        const access_levels_for_user = [ ClientCommand.access_levels.EVERYONE ]; // default access level

        /* determine the user's access levels */
        if (interaction.guildId) {
            const guild = await discord_client.guilds.fetch(interaction.guildId);
            const guild_owner_id = guild.ownerID;

            const guild_member = await guild.members.fetch(interaction.member.id);
            const guild_member_roles = guild_member.roles.cache;
            const guild_member_is_administrator = guild_member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR);

            const guild_config = await GuildConfigsManager.fetch(guild.id);
            const guild_staff_role_ids = guild_config.staff_role_ids;
            const guild_admin_role_ids = guild_config.admin_role_ids;

            /* check for guild staff */
            if (guild_member_roles.hasAny(...guild_staff_role_ids)) {
                access_levels_for_user.push(ClientCommand.access_levels.GUILD_STAFF);
            }

            /* check for guild admin */
            if (guild_member_roles.hasAny(...guild_admin_role_ids) || guild_member_is_administrator) {
                access_levels_for_user.push(ClientCommand.access_levels.GUILD_ADMIN);
            }

            /* check for guild owner */
            if (guild_owner_id === interaction.user.id) {
                access_levels_for_user.push(ClientCommand.access_levels.GUILD_OWNER);
            }

        }

        /* check for bot super */
        const bot_super_people = await go_mongo_db.find(process.env.MONGO_DATABASE_NAME, process.env.MONGO_SUPER_PEOPLE_COLLECTION_NAME);
        const bot_super_people_ids = bot_super_people.map(bot_super_person => bot_super_person.discord_user_id);
        if (bot_super_people_ids.includes(interaction.user.id)) {
            access_levels_for_user.push(ClientCommand.access_levels.BOT_SUPER);
        }

        /* check the user's access levels */
        const highest_access_level_for_user = Math.max(...access_levels_for_user);
        if (highest_access_level_for_user < this.category.required_access_level) {
            await interaction.reply({
                ephemeral: true,
                embeds: [
                    new CustomEmbed({
                        color: 0xFF00FF,
                        title: 'Access Denied',
                        description: `You aren\'t allowed to use the \`${this.name}\` command.`,
                        fields: [
                            {
                                name: 'Required Access Level',
                                value: `${this.category.required_access_level}`,
                                inline: true,
                            }, {
                                name: 'Your Access Level',
                                value: `${highest_access_level_for_user}`,
                                inline: true,
                            },
                        ],
                    }),
                ],
            }).catch(console.warn);
            return;
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
