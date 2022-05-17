'use strict';

//------------------------------------------------------------//

const path = require('node:path');
const recursiveReadDirectory = require('recursive-read-directory');
const Discord = require('discord.js');

const { go_mongo_db } = require('../lib/go_mongo_db');

const { CustomEmbed } = require('./message');
const { GuildConfigsManager } = require('./guild_configs');

//------------------------------------------------------------//

/**
 * @typedef {{
 *  id: string,
 *  name: string,
 *  description: string,
 *  required_access_level: number,
 * }} ClientCommandCategory
 */

//------------------------------------------------------------//

class ClientCommandHelper {
    /** @type {Object.<string, number>} */
    static access_levels = {
        EVERYONE: 1,
        // DONATOR: 2, // reserved for future usage
        GUILD_STAFF: 3,
        GUILD_ADMIN: 4,
        GUILD_OWNER: 5,
        BOT_SUPER: 6,
    };

    /** @type {Object.<string, string>} */
    static execution_environments = {
        GUILD_AND_DMS: 'GUILD_AND_DMS',
        GUILD_ONLY: 'GUILD_ONLY',
        DMS_ONLY: 'DMS_ONLY',
    };

    /** @type {Discord.Collection<string, ClientCommandCategory>} */
    static categories = new Discord.Collection([
        {
            id: 'HELP_AND_INFORMATION',
            name: 'Help And Information',
            description: 'n/a',
        }, {
            id: 'MUSIC_CONTROLS',
            name: 'Music Controls',
            description: 'n/a',
        }, {
            id: 'FUN_STUFF',
            name: 'Fun Stuff',
            description: 'n/a',
        }, {
            id: 'UTILITIES',
            name: 'Utilities',
            description: 'n/a',
        }, {
            id: 'GUILD_STAFF',
            name: 'Guild Staff',
            description: 'Commands for guild mods, guild admins, guild owner, and bot super.',
        }, {
            id: 'GUILD_ADMIN',
            name: 'Guild Admin',
            description: 'Commands for guild admins, guild owner, and bot super.',
        }, {
            id: 'GUILD_OWNER',
            name: 'Guild Owner',
            description: 'Commands for the guild owner and bot super.',
        }, {
            id: 'BOT_SUPER',
            name: 'Bot Super',
            description: 'Commands for bot admins and the bot owner.',
        },
    ].map((command_category) => ([ command_category.id, command_category ])));

    /**
     * @param {Discord.Interaction} interaction
     * @param {string} required_environment
     * @returns {Promise<boolean>}
     */
    static async checkExecutionEnvironment(interaction, required_environment) {
        let is_valid_environment;

        switch (required_environment) {
            case ClientCommandHelper.execution_environments.GUILD_AND_DMS: {
                is_valid_environment = true;
                break;
            }

            case ClientCommandHelper.execution_environments.GUILD_ONLY: {
                is_valid_environment = Boolean(interaction.guildId);
                break;
            }

            case ClientCommandHelper.execution_environments.DMS_ONLY: {
                is_valid_environment = !interaction.guildId;
                break;
            }

            default: {
                throw new Error(`Unknown execution environment: ${required_environment}`);
            }
        }

        if (!is_valid_environment) {
            interaction.reply({
                ephemeral: true,
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.VIOLET,
                        title: 'Invalid Execution Environment',
                        description: `This command can only be executed in ${required_environment}`,
                    }),
                ],
            });
        }

        return is_valid_environment;
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} interaction
     * @param {number} required_access_level
     * @returns {Promise<boolean}
     */
    static async checkUserAccessLevel(discord_client, interaction, required_access_level) {
        const access_levels_for_user = [ ClientCommandHelper.access_levels.EVERYONE ]; // default access level

        /* determine the user's access levels */
        if (interaction.guildId) {
            const guild = await discord_client.guilds.fetch(interaction.guildId);
            const guild_owner_id = guild.ownerID;

            const guild_member = await guild.members.fetch(interaction.member.id);
            const guild_member_roles = guild_member.roles.cache;
            const guild_member_is_administrator = guild_member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR);

            const guild_config = await GuildConfigsManager.fetch(guild.id);
            const guild_staff_role_ids = guild_config.staff_role_ids ?? [];
            const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

            /* check for guild staff */
            if (guild_member_roles.hasAny(...guild_staff_role_ids)) {
                access_levels_for_user.push(ClientCommandHelper.access_levels.GUILD_STAFF);
            }

            /* check for guild admin */
            if (guild_member_roles.hasAny(...guild_admin_role_ids) || guild_member_is_administrator) {
                access_levels_for_user.push(ClientCommandHelper.access_levels.GUILD_ADMIN);
            }

            /* check for guild owner */
            if (guild_owner_id === interaction.user.id) {
                access_levels_for_user.push(ClientCommandHelper.access_levels.GUILD_OWNER);
            }
        }

        /* check for bot super */
        const bot_super_people = await go_mongo_db.find(process.env.MONGO_DATABASE_NAME, process.env.MONGO_SUPER_PEOPLE_COLLECTION_NAME);
        const bot_super_people_ids = bot_super_people.map(bot_super_person => bot_super_person.discord_user_id);
        if (bot_super_people_ids.includes(interaction.user.id)) {
            access_levels_for_user.push(ClientCommandHelper.access_levels.BOT_SUPER);
        }

        /* check the user's access levels */
        const highest_access_level_for_user = Math.max(...access_levels_for_user);
        if (highest_access_level_for_user < required_access_level) {
            interaction.reply({
                ephemeral: true,
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.VIOLET,
                        title: 'Access Denied',
                        description: 'You aren\'t allowed to do that!',
                        fields: [
                            {
                                name: 'Required Access Level',
                                value: `${required_access_level}`,
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

            return false; // the user is not allowed to use this command
        }

        return true;
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} interaction
     * @param {Discord.PermissionResolvable[]} required_permissions
     * @returns {Promise<boolean>}
     */
    static async checkBotPermissions(discord_client, interaction, required_permissions) {
        /** @type {Discord.TextChannel | Discord.NewsChannel} */
        const channel = await discord_client.channels.fetch(interaction.channelId);
        if (!channel.isText()) return true; // the channel is not a text channel, so we can't check permissions

        const bot_guild_permissions = channel.guild.me.permissions;
        const bot_channel_permissions = channel.permissionsFor(discord_client.user.id);
        const bot_permissions = new Discord.Permissions([ bot_guild_permissions, bot_channel_permissions ]);

        const missing_permissions = required_permissions.filter(required_permission => !bot_permissions.has(required_permission));

        if (missing_permissions.length > 0) {
            const mapped_missing_permission_flags = missing_permissions.map(permission => Object.entries(Discord.Permissions.FLAGS).find(([ _, perm ]) => perm === permission)?.[0]);

            interaction.reply({
                ephemeral: true,
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.VIOLET,
                        title: 'Missing Permissions',
                        description: `In order to do that, I need you to grant me the following permission(s):\n>>> ${mapped_missing_permission_flags.join('\n')}`,
                    }),
                ],
            }).catch(console.warn);

            return false; // the bot does not have the required permissions
        }

        return true; // the bot has the required permissions
    }
}

//------------------------------------------------------------//

/**
 * @typedef {Discord.ApplicationCommandOptionData} DiscordInteractionOptionData
 *
 * @typedef {string} ClientInteractionIdentifier
 * @typedef {number} ClientInteractionType
 * @typedef {{
 *  description: string,
 *  type: number,
 *  options: DiscordInteractionOptionData[],
 *  default_permission: boolean,
 * }} ClientInteractionApplicationCommandData
 * @typedef {ClientInteractionApplicationCommandData} ClientInteractionData
 * @typedef {(discord_client: Discord.Client, interaction: Discord.Interaction) => Promise<unknown>} ClientInteractionHandler
 *
 * @typedef {{
 *  identifier: ClientInteractionIdentifier,
 *  type: ClientInteractionType,
 *  data?: ClientInteractionData,
 *  metadata: {
 *      allowed_execution_environment?: string,
 *      command_category?: ClientCommandCategory,
 *      required_bot_permissions?: Discord.PermissionResolvable[],
 *      required_user_access_level?: number,
 *  },
 *  handler: ClientInteractionHandler,
 * }} ClientInteractionConstructorOptions
 */

//------------------------------------------------------------//

class ClientInteraction {
    /** @param {ClientInteractionConstructorOptions} opts */
    constructor(opts) {
        this._identifier = opts.identifier;
        this._type = opts.type;
        this._data = opts.data;
        this._metadata = opts.metadata;
        this._handler = opts.handler;

        if (typeof this._identifier !== 'string') throw new Error('ClientInteraction identifier must be a string');
        if (typeof this._type !== 'number') throw new Error('ClientInteraction type must be a number');
        if (this._data && typeof this._data !== 'object') throw new Error('ClientInteraction data must be an object');
        if (this._metadata && typeof this._metadata !== 'object') throw new Error('ClientInteraction metadata must be an object');
        if (typeof this._handler !== 'function') throw new Error('ClientInteraction handler must be a function');
    }

    get identifier() {
        return this._identifier;
    }

    get type() {
        return this._type;
    }

    get data() {
        return {
            name: this._identifier,
            ...this._data,
        };
    }

    get metadata() {
        return this._metadata ?? {};
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} interaction
     */
    async handler(discord_client, interaction) {
        if (this.metadata.allowed_execution_environment) {
            const is_allowed_execution_environment = await ClientCommandHelper.checkExecutionEnvironment(interaction, this.metadata.allowed_execution_environment);
            if (!is_allowed_execution_environment) return;
        }

        if (this.metadata.required_user_access_level) {
            const is_user_permitted = await ClientCommandHelper.checkUserAccessLevel(discord_client, interaction, this.metadata.required_user_access_level);
            if (!is_user_permitted) return;
        }

        if (this.metadata.required_bot_permissions) {
            const is_bot_permitted = await ClientCommandHelper.checkBotPermissions(discord_client, interaction, this.metadata.required_bot_permissions);
            if (!is_bot_permitted) return;
        }

        return await this._handler(discord_client, interaction);
    }
}

//------------------------------------------------------------//

class ClientInteractionManager {
    /** @type {Discord.Collection<ClientInteractionIdentifier, ClientInteraction>} */
    static interactions = new Discord.Collection();

    /**
     * @param {ClientInteraction} client_interaction
     * @returns {Promise<ClientInteractionManager.interactions>}
     */
    static async registerClientInteraction(client_interaction) {
        return ClientInteractionManager.interactions.set(client_interaction.identifier, client_interaction);
    }

    static async loadClientInteractions() {
        const path_to_interaction_files = path.join(process.cwd(), 'src', 'interactions');
        const client_interaction_file_names = recursiveReadDirectory(path_to_interaction_files);

        for (const client_interaction_file_name of client_interaction_file_names) {
            const client_interaction_file_path = path.join(path_to_interaction_files, client_interaction_file_name);

            try {
                const client_interaction = require(client_interaction_file_path);
                if (!(client_interaction instanceof ClientInteraction)) throw new Error('client_interaction is not an instance of ClientInteraction');

                await ClientInteractionManager.registerClientInteraction(client_interaction);
            } catch (error) {
                console.trace('unable to register global command:', client_interaction_file_path, error);
                continue;
            }
        }
    }

    /**
     * @param {Discord.Client} discord_client
     * @param {Discord.Interaction} unknown_interaction
     * @returns {Promise<unknown>}
     */
    static async handleUnknownInteraction(discord_client, unknown_interaction) {
        console.log('ClientInteractionManager.handleUnknownInteraction():', {
            unknown_interaction,
        });

        /** @type {ClientInteraction?} */
        const client_interaction = ClientInteractionManager.interactions.find(interaction => {
            const unknown_interaction_identifier = unknown_interaction.type === 'MESSAGE_COMPONENT' ? (
                unknown_interaction.customId
            ) : (
                unknown_interaction.type === 'APPLICATION_COMMAND' ? (
                    unknown_interaction.commandName
                ) : (
                    unknown_interaction.type === 'APPLICATION_COMMAND_AUTOCOMPLETE' ? (
                        unknown_interaction.commandName
                    ) : (
                        unknown_interaction.type === 'PING' ? (
                            unknown_interaction.id
                        ) : (
                            null
                        )
                    )
                )
            );

            return interaction.identifier === unknown_interaction_identifier;
        });

        /* ensure the interaction exists */
        if (!client_interaction) return;

        /* run the interaction handler */
        try {
            await client_interaction.handler(discord_client, unknown_interaction);
        } catch (error) {
            console.trace({
                unknown_interaction: unknown_interaction,
                client_interaction: client_interaction,
                error_message: error,
            });

            unknown_interaction.channel.send({
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.colors.RED,
                        title: 'Interaction Error',
                        description: `An error occurred while handling: \`${client_interaction.identifier}\``,
                        fields: [
                            {
                                name: 'Error Message',
                                value: `\`\`\`\n${error}\n\`\`\``,
                            },
                        ],
                    }),
                ],
            }).catch(console.warn);
        }
    }
}

//------------------------------------------------------------//

module.exports = {
    ClientCommandHelper,
    ClientInteraction,
    ClientInteractionManager,
};
