'use strict';

//------------------------------------------------------------//

import path from 'node:path';

import Discord from 'discord.js';

import { go_mongo_db } from '../lib/go_mongo_db';

import { CustomEmbed } from './message';

import { GuildConfigsManager } from './guild_configs';

const recursiveReadDirectory = require('recursive-read-directory');

//------------------------------------------------------------//

type ClientCommandCategory = {
    id: string;
    name: string;
    description: string;
    // required_access_level: number;
};

enum ClientCommandAccessLevels {
    EVERYONE,
    // DONATOR, // reserved for future usage
    GUILD_STAFF,
    GUILD_ADMIN,
    GUILD_OWNER,
    BOT_SUPER,
}


//------------------------------------------------------------//

export class ClientCommandHelper {
    static access_levels = ClientCommandAccessLevels;

    static execution_environments = {
        GUILD_AND_DMS: 'GUILD_AND_DMS',
        GUILD_ONLY: 'GUILD_ONLY',
        DMS_ONLY: 'DMS_ONLY',
    };

    static categories: Discord.Collection<string, ClientCommandCategory> = new Discord.Collection([
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

    static async checkExecutionEnvironment(interaction: Discord.Interaction<'cached'>, required_environment: string): Promise<boolean> {
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

        if (!is_valid_environment && interaction.isRepliable()) {
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

    static async checkUserAccessLevel(
        discord_client: Discord.Client,
        interaction: Discord.Interaction<'cached'>,
        required_access_level: number,
    ): Promise<boolean> {
        const access_levels_for_user = [ ClientCommandHelper.access_levels.EVERYONE ]; // default access level

        /* determine the user's access levels */
        if (interaction.guildId) {
            const guild = await discord_client.guilds.fetch(interaction.guildId);
            const guild_owner_id = guild.ownerId;

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
        const bot_super_people = await go_mongo_db.find(process.env.MONGO_DATABASE_NAME as string, process.env.MONGO_SUPER_PEOPLE_COLLECTION_NAME as string, {});
        const bot_super_people_ids = bot_super_people.map(bot_super_person => bot_super_person.discord_user_id);
        if (bot_super_people_ids.includes(interaction.user.id)) {
            access_levels_for_user.push(ClientCommandHelper.access_levels.BOT_SUPER);
        }

        /* check the user's access levels */
        const highest_access_level_for_user = Math.max(...access_levels_for_user);
        if (highest_access_level_for_user < required_access_level) {
            if (interaction.isRepliable()) {
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
            }

            return false; // the user is not allowed to use this command
        }

        return true;
    }

    static async checkBotPermissions(
        discord_client: Discord.Client,
        interaction: Discord.Interaction<'cached'>,
        required_permissions: Discord.PermissionResolvable[],
    ): Promise<boolean> {
        if (!interaction.inGuild()) return true; // if the interaction is not in a guild, then assume the bot has all permissions we might need

        const channel = await discord_client.channels.fetch(interaction.channelId as string) as Discord.GuildChannel;
        if (!channel) return true; // the channel doesn't exist, so we can assume the bot has all permissions
        if (!channel?.isText()) return true; // the channel is not a text channel, so we can't check permissions

        const bot_guild_permissions = channel.guild.me!.permissions;
        const bot_channel_permissions = channel.permissionsFor(discord_client.user!.id)!;
        const bot_permissions = new Discord.Permissions([ bot_guild_permissions, bot_channel_permissions ]);

        const missing_permissions = required_permissions.filter(required_permission => !bot_permissions.has(required_permission));

        if (missing_permissions.length > 0) {
            const mapped_missing_permission_flags = missing_permissions.map(permission => Object.entries(Discord.Permissions.FLAGS).find(([ _, perm ]) => perm === permission)?.[0]);

            if (interaction.isRepliable()) {
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
            }

            return false; // the bot does not have the required permissions
        }

        return true; // the bot has the required permissions
    }
}

//------------------------------------------------------------//

export type ClientInteractionIdentifier = string;
export type ClientInteractionType = number;
export type ClientInteractionData = {
    type: ClientInteractionType,
    description: string,
    options: Discord.ApplicationCommandOptionData[],
}
export type ClientInteractionMetadata = {
    [key: string]: any;
    allowed_execution_environment?: string;
    command_category?: ClientCommandCategory;
    required_bot_permissions?: Discord.PermissionResolvable[];
    required_user_access_level?: number;
};
export type ClientInteractionHandler = (discord_client: Discord.Client<true>, interaction: Discord.Interaction) => Promise<unknown>;

export type ClientInteractionConstructorOptions = {
    type: ClientInteractionType;
    identifier: ClientInteractionIdentifier;
    data?: ClientInteractionData;
    metadata: {
        allowed_execution_environment?: string;
        command_category?: ClientCommandCategory;
        required_bot_permissions?: Discord.PermissionResolvable[];
        required_user_access_level?: number;
    },
    handler: ClientInteractionHandler;
}

//------------------------------------------------------------//

export class ClientInteraction {
    private _identifier: ClientInteractionIdentifier;
    private _type: ClientInteractionType;
    private _data: ClientInteractionData | undefined;
    private _metadata: ClientInteractionMetadata | undefined;
    private _handler: ClientInteractionHandler;

    constructor(opts: ClientInteractionConstructorOptions) {
        this._identifier = opts.identifier;
        this._type = opts.type;
        this._data = opts.data;
        this._metadata = opts.metadata;
        this._handler = opts.handler;
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

    async handler(
        discord_client: Discord.Client<true>,
        interaction: Discord.Interaction<'cached'>,
    ) {
        if (this.metadata.allowed_execution_environment) {
            const is_allowed_execution_environment = await ClientCommandHelper.checkExecutionEnvironment(interaction, this.metadata.allowed_execution_environment);
            if (!is_allowed_execution_environment) {
                console.warn(`[ClientInteraction: ${this.identifier}]; unable to execute while not in specified allowed environment: ${this.metadata.allowed_execution_environment};`);
                return;
            }
        }

        if (this.metadata.required_user_access_level) {
            const is_user_permitted = await ClientCommandHelper.checkUserAccessLevel(discord_client, interaction, this.metadata.required_user_access_level);
            if (!is_user_permitted) {
                console.warn(`[ClientInteraction: ${this.identifier}]; unable to execute while user: ${interaction.user.id}; is not permitted`);
                return;
            }
        }

        if (this.metadata.required_bot_permissions) {
            const is_bot_permitted = await ClientCommandHelper.checkBotPermissions(discord_client, interaction, this.metadata.required_bot_permissions);
            if (!is_bot_permitted) {
                console.warn(`[ClientInteraction: ${this.identifier}]; unable to execute while missing required bot permissions: ${this.metadata.required_bot_permissions.join(', ')};`);
                return;
            }
        }

        console.log(`[ClientInteraction: ${this.identifier}]; executing handler...`);

        await this._handler(discord_client, interaction).catch(console.trace);
    }
}

//------------------------------------------------------------//

export class ClientInteractionManager {
    static interactions: Discord.Collection<ClientInteractionIdentifier, ClientInteraction> = new Discord.Collection();

    static async registerClientInteractions(discord_client: Discord.Client<true>) {
        ClientInteractionManager.interactions.clear(); // remove all existing interactions so we can re-register them

        const path_to_interaction_files = path.join(process.cwd(), 'dist', 'interactions');
        const client_interaction_file_names: string[] = recursiveReadDirectory(path_to_interaction_files);

        for (const client_interaction_file_name of client_interaction_file_names) {
            if (!client_interaction_file_name.endsWith('.js')) continue;

            const client_interaction_file_path = path.join(path_to_interaction_files, client_interaction_file_name);

            console.log(`<DC S#(${discord_client.shard!.ids.join(', ')})> loading client interaction... ${client_interaction_file_path}`);

            const { default: client_interaction } = require(client_interaction_file_path) as { default: unknown };

            if (!(client_interaction instanceof ClientInteraction)) {
                console.trace(`<DC S#(${discord_client.shard!.ids.join(', ')})> failed to load client interaction: ${client_interaction_file_path}`);
                continue;
            }

            if (ClientInteractionManager.interactions.has(client_interaction.identifier)) {
                console.warn(`<DC S#(${discord_client.shard!.ids.join(', ')})> client interaction: ${client_interaction.identifier} is already registered; skipping...`);
                continue;
            }

            ClientInteractionManager.interactions.set(client_interaction.identifier, client_interaction);
        }
    }

    static async handleUnknownInteraction(
        discord_client: Discord.Client,
        unknown_interaction: Discord.Interaction<'cached'>,
    ): Promise<unknown> {
        console.log('ClientInteractionManager.handleUnknownInteraction(): received interaction from discord:', unknown_interaction);

        const client_interaction: ClientInteraction | undefined = ClientInteractionManager.interactions.find(interaction => {
            const unknown_interaction_identifier = unknown_interaction.isMessageComponent() ? (
                unknown_interaction.customId
            ) : (
                unknown_interaction.isModalSubmit() ? (
                    unknown_interaction.customId
                ) : (
                    unknown_interaction.isApplicationCommand() ? (
                        unknown_interaction.commandName
                    ) : (
                        unknown_interaction.isAutocomplete() ? (
                            unknown_interaction.commandName
                        ) : (
                            unknown_interaction.id
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
            console.log(`ClientInteractionManager.handleUnknownInteraction(): running handler for interaction: ${client_interaction.identifier}`, client_interaction);
            await client_interaction.handler(discord_client, unknown_interaction);
        } catch (error) {
            console.trace({
                unknown_interaction: unknown_interaction,
                client_interaction: client_interaction,
                error_message: error,
            });

            unknown_interaction.channel?.send({
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
