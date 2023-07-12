//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { DiscordClientWithSharding, DistributiveOmit } from '@root/types';

import process from 'node:process';

import * as path from 'node:path';

import * as Discord from 'discord.js';

import recursiveReadDirectory from 'recursive-read-directory';

import { EnvironmentVariableName, parseEnvironmentVariable, stringEllipses } from '@root/common/lib/utilities';

import { sendWebhookMessage } from '@root/common/app/webhook';

import { CustomEmbed } from './message';

import { GuildConfigsManager } from './guild_configs';

import { doesUserHaveDonatorStatus, doesUserHaveSuperPersonStatus } from './permissions';

//------------------------------------------------------------//

export type ClientCommandCategoryId =
    | 'HELP_AND_INFORMATION'
    | 'MUSIC_CONTROLS'
    | 'FUN_STUFF'
    | 'UTILITIES'
    | 'DONATOR'
    | 'GUILD_STAFF'
    | 'GUILD_ADMIN'
    | 'GUILD_OWNER'
    | 'BOT_SUPER';

type ClientCommandCategory = {
    id: ClientCommandCategoryId;
    name: string;
    description: string;
};

enum ClientCommandAccessLevels {
    Everyone = 1,
    Donator = 25,
    GuildStaff = 100,
    GuildAdmin = 500,
    GuildOwner = 1000,
    BotSuper = 100_000_000,
}

enum ClientCommandExecutionEnvironments {
    Anywhere = 0,
    GuildOnly = 1,
    DirectMessagesOnly = 2,
}

//------------------------------------------------------------//

const anonymous_command_history_webhook_url = parseEnvironmentVariable(EnvironmentVariableName.DiscordBotCentralLoggingAnonymousCommandHistoryWebhook, 'string');

const verbose_interaction_logging = parseEnvironmentVariable(EnvironmentVariableName.DiscordBotVerboseInteractionLogging, 'string');

//------------------------------------------------------------//

function stringifyOptions(
    options: Readonly<Discord.CommandInteractionOption[]>,
): string {
    const options_clone = [ ...options ];

    return options_clone.map((option) => {
        if (option.options?.length) return `${option.name} ${stringifyOptions(option.options)}`;
        if (option.value) return `${option.name}:${option.value}`;
        return option.name;
    }).join(' ');
}

//------------------------------------------------------------//

export class ClientCommandHelper {
    static AccessLevels = ClientCommandAccessLevels;

    static ExecutionEnvironments = ClientCommandExecutionEnvironments;

    static categories = Object.fromEntries(
        ([
            {
                id: 'HELP_AND_INFORMATION',
                name: 'Help And Information',
                description: 'Commands for getting started with this bot.',
            },
            {
                id: 'MUSIC_CONTROLS',
                name: 'Music Controls',
                description: 'Commands for controlling music playback.',
            },
            {
                id: 'FUN_STUFF',
                name: 'Fun Stuff',
                description: 'Commands for fun stuff that aren\'t considered utilities.',
            },
            {
                id: 'UTILITIES',
                name: 'Utilities',
                description: 'Commands for general purpose utilities.',
            },
            {
                id: 'DONATOR',
                name: 'Donator',
                description: 'Commands for donator-only features.',
            },
            {
                id: 'GUILD_STAFF',
                name: 'Guild Staff',
                description: 'Commands for guild mods, guild admins, guild owner, and bot super.',
            },
            {
                id: 'GUILD_ADMIN',
                name: 'Guild Admin',
                description: 'Commands for guild admins, guild owner, and bot super.',
            },
            {
                id: 'GUILD_OWNER',
                name: 'Guild Owner',
                description: 'Commands for the guild owner and bot super.',
            },
            {
                id: 'BOT_SUPER',
                name: 'Bot Super',
                description: 'Commands for bot admins and the bot owner.',
            },
        ] as ClientCommandCategory[]).map(
            (category) => ([ category.id, category ])
        )
    ) as {
        [key in ClientCommandCategoryId]: ClientCommandCategory;
    };

    static async checkExecutionEnvironment(
        interaction: Discord.Interaction,
        required_environment: ClientCommandExecutionEnvironments,
    ): Promise<boolean> {
        let is_valid_environment;

        switch (required_environment) {
            case ClientCommandExecutionEnvironments.Anywhere: {
                is_valid_environment = true;
                break;
            }

            case ClientCommandExecutionEnvironments.GuildOnly: {
                is_valid_environment = Boolean(interaction.guildId);
                break;
            }

            case ClientCommandExecutionEnvironments.DirectMessagesOnly: {
                is_valid_environment = !interaction.guildId;
                break;
            }

            default: {
                throw new Error(`Unknown execution environment: ${required_environment}`);
            }
        }

        if (!is_valid_environment && interaction.isRepliable()) {
            await interaction.reply({
                ephemeral: true,
                embeds: [
                    CustomEmbed.from({
                        color: CustomEmbed.Colors.Violet,
                        title: 'Invalid Execution Environment',
                        description: `This command can only be executed in ${required_environment}`,
                    }),
                ],
            }).catch(console.warn);
        }

        return is_valid_environment;
    }

    static async checkUserAccessLevel(
        discord_client: Discord.Client<true>,
        interaction: Discord.Interaction,
        required_access_level: ClientCommandAccessLevels,
        reply_to_interaction: boolean = true,
    ): Promise<boolean> {
        const access_levels_for_user = [ ClientCommandHelper.AccessLevels.Everyone ]; // default access level

        /* check if the user is a donator */
        const is_user_a_donator = await doesUserHaveDonatorStatus(interaction.user.id);
        if (is_user_a_donator) {
            access_levels_for_user.push(ClientCommandHelper.AccessLevels.Donator);
        }

        /* determine the user's access levels */
        if (interaction.guildId) {
            const guild = await discord_client.guilds.fetch(interaction.guildId);
            const guild_owner_id = guild.ownerId;

            const guild_member = await guild.members.fetch(interaction.user.id);
            const guild_member_roles = guild_member.roles.cache;
            const guild_member_is_administrator = guild_member.permissions.has(Discord.PermissionFlagsBits.Administrator);

            const guild_config = await GuildConfigsManager.fetch(guild.id);
            const guild_staff_role_ids = guild_config.staff_role_ids ?? [];
            const guild_admin_role_ids = guild_config.admin_role_ids ?? [];

            /* check for guild staff */
            if (guild_member_roles.hasAny(...guild_staff_role_ids)) {
                access_levels_for_user.push(ClientCommandHelper.AccessLevels.GuildStaff);
            }

            /* check for guild admin */
            if (guild_member_roles.hasAny(...guild_admin_role_ids) || guild_member_is_administrator) {
                access_levels_for_user.push(ClientCommandHelper.AccessLevels.GuildAdmin);
            }

            /* check for guild owner */
            if (guild_owner_id === interaction.user.id) {
                access_levels_for_user.push(ClientCommandHelper.AccessLevels.GuildOwner);
            }
        }

        /* check if the user is a super person (bot admin) */
        const is_user_a_super_person = await doesUserHaveSuperPersonStatus(interaction.user.id);
        if (is_user_a_super_person) {
            access_levels_for_user.push(ClientCommandHelper.AccessLevels.BotSuper);
        }

        /* check the user's access levels */
        const highest_access_level_for_user: ClientCommandAccessLevels = Math.max(...access_levels_for_user);
        if (highest_access_level_for_user < required_access_level) {
            if (reply_to_interaction && interaction.isRepliable()) {
                interaction.reply({
                    ephemeral: true,
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Violet,
                            title: 'Access Denied',
                            description: 'You aren\'t allowed to do that!',
                            fields: [
                                {
                                    name: 'Your Access Level',
                                    value: `${ClientCommandAccessLevels[highest_access_level_for_user]}`,
                                    inline: true,
                                }, {
                                    name: 'Required Access Level',
                                    value: `${ClientCommandAccessLevels[required_access_level]}`,
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
        interaction: Discord.Interaction,
        required_permissions: bigint[],
    ): Promise<boolean> {
        if (!interaction.inGuild()) return true; // if the interaction is not in a guild, then assume the bot has all of the required permissions

        const channel = await discord_client.channels.fetch(interaction.channelId as string) as Discord.GuildChannel;
        if (!channel) return true; // the channel doesn't exist, so we can assume the bot has all of the required permissions
        if (!channel?.isTextBased()) return true; // the channel is not a text channel, so we can't check permissions

        const bot_member = await channel.guild.members.fetch(discord_client.user!.id);

        const bot_guild_permissions = bot_member.permissions;
        const bot_channel_permissions = channel.permissionsFor(discord_client.user!.id, true)!;
        const bot_permissions = new Discord.PermissionsBitField([ bot_guild_permissions, bot_channel_permissions ]);

        const missing_permissions = required_permissions.filter((required_permission) => !bot_permissions.has(required_permission));

        if (missing_permissions.length > 0) {
            const mapped_missing_permission_flags = missing_permissions.map((permission) => Object.entries(Discord.PermissionFlagsBits).find(([ _, perm ]) => perm === permission)?.[0]);

            if (interaction.isRepliable()) {
                interaction.reply({
                    ephemeral: true,
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Violet,
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

type ClientInteractionCooldownUserId = Discord.Snowflake;

type ClientInteractionCooldownData = {
    last_execution_epoch: number;
    cooldown_duration_ms: number;
};

class ClientInteractionCooldownManager {
    private static _cooldowns = new Map<ClientInteractionCooldownUserId, ClientInteractionCooldownData>();

    public static readonly default_cooldown_duration_ms: number = 1_500; // 1.5 seconds

    public static async isUserOnCooldown(
        user_id: ClientInteractionCooldownUserId,
    ): Promise<boolean> {
        const cooldown_data = ClientInteractionCooldownManager._cooldowns.get(user_id);
        if (!cooldown_data) return false;

        const now_epoch = Date.now();
        const cooldown_expiration_epoch = cooldown_data.last_execution_epoch + cooldown_data.cooldown_duration_ms;

        if (cooldown_expiration_epoch > now_epoch) return true;

        ClientInteractionCooldownManager._cooldowns.delete(user_id);

        return false;
    }

    public static async setUserOnCooldown(
        user_id: ClientInteractionCooldownUserId,
        duration_ms: number,
    ): Promise<void> {
        ClientInteractionCooldownManager._cooldowns.set(user_id, {
            last_execution_epoch: Date.now(),
            cooldown_duration_ms: duration_ms,
        });
    }
}

//------------------------------------------------------------//

export type ClientInteractionIdentifier = string;

export type ClientInteractionMetadata = {
    [key: string]: unknown;
    command_category?: ClientCommandCategory;
    allowed_execution_environment?: ClientCommandExecutionEnvironments;
    required_bot_permissions?: bigint[];
    required_user_access_level?: ClientCommandAccessLevels;
};

export type ClientInteractionHandler = (discord_client: DiscordClientWithSharding, interaction: Discord.Interaction) => Promise<void>;

//------------------------------------------------------------//

export class ClientInteraction<
    DiscordInteractionCommandData extends Discord.ApplicationCommandData,
> {
    private _identifier;
    private _type;
    private _data;
    private _metadata;
    private _handler;

    public cooldown_duration_ms: number = ClientInteractionCooldownManager.default_cooldown_duration_ms;

    constructor(
        opts: {
            type: Discord.InteractionType;
            identifier: ClientInteractionIdentifier;
            data?: DistributiveOmit<DiscordInteractionCommandData, 'name'> | never;
            metadata?: ClientInteractionMetadata;
            handler: ClientInteractionHandler;
        },
    ) {
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
            ...this._data,
            name: this._identifier,
        };
    }

    get metadata() {
        return this._metadata ?? {};
    }

    async handler(
        discord_client: DiscordClientWithSharding,
        interaction: Discord.Interaction,
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
    static interactions = new Discord.Collection<ClientInteractionIdentifier, ClientInteraction<Discord.ApplicationCommandData>>();

    static async registerClientInteractions(discord_client: DiscordClientWithSharding) {
        ClientInteractionManager.interactions.clear(); // remove all existing interactions

        const path_to_interaction_files = path.join(process.cwd(), 'dist', 'interactions');
        const client_interaction_file_names: string[] = recursiveReadDirectory(path_to_interaction_files);

        for (const client_interaction_file_name of client_interaction_file_names) {
            if (!client_interaction_file_name.endsWith('.js')) continue;

            const client_interaction_file_path = path.join(path_to_interaction_files, client_interaction_file_name);

            console.info(`<DC S#(${discord_client.shard.ids.join(', ')})> registering client interaction... ${client_interaction_file_path}`);

            delete require.cache[require.resolve(client_interaction_file_path)]; // this is necessary to ensure that the file is reloaded every time

            const { default: client_interaction } = await import(client_interaction_file_path) as { default: unknown };

            if (!(client_interaction instanceof ClientInteraction)) {
                console.trace(`<DC S#(${discord_client.shard.ids.join(', ')})> failed to load client interaction: ${client_interaction_file_path};`);
                continue;
            }

            ClientInteractionManager.interactions.set(client_interaction.identifier, client_interaction);
        }
    }

    static async handleUnknownInteraction(
        discord_client: DiscordClientWithSharding,
        unknown_interaction: Discord.Interaction,
    ): Promise<void> {
        /* ensure the discord client is ready */
        if (!discord_client.isReady()) throw new Error('ClientInteractionManager.handleUnknownInteraction(): discord client is not ready');

        /* ensure the discord client support sharding */
        if (!discord_client.shard) throw new Error('ClientInteractionManager.handleUnknownInteraction(): discord client does not support sharding');

        if (verbose_interaction_logging === 'enabled') {
            console.log('ClientInteractionManager.handleUnknownInteraction(): received interaction from discord:', unknown_interaction);
        }

        let unknown_interaction_identifier: string;

        switch (unknown_interaction.type) {
            case Discord.InteractionType.ApplicationCommand: {
                unknown_interaction_identifier = unknown_interaction.commandName;
                break;
            }

            case Discord.InteractionType.MessageComponent: {
                unknown_interaction_identifier = unknown_interaction.customId;
                break;
            }

            case Discord.InteractionType.ApplicationCommandAutocomplete: {
                unknown_interaction_identifier = unknown_interaction.commandName;
                break;
            }

            case Discord.InteractionType.ModalSubmit: {
                unknown_interaction_identifier = unknown_interaction.customId;
                break;
            }

            default: {
                /* this is necessary to re-assert that a 'never' condition might actually happen */
                const really_unknown_interaction = unknown_interaction as Discord.Interaction;

                console.warn(`ClientInteractionManager.handleUnknownInteraction(): unknown interaction type: ${really_unknown_interaction.type};`);

                unknown_interaction_identifier = really_unknown_interaction.id;

                break;
            }
        }

        const client_interaction = ClientInteractionManager.interactions.get(unknown_interaction_identifier);

        /* ensure the client interaction exists before handling it */
        if (!client_interaction) return;

        /* check if the user is on a cooldown */
        const is_user_on_cooldown = await ClientInteractionCooldownManager.isUserOnCooldown(unknown_interaction.user.id);
        if (is_user_on_cooldown) {
            console.warn(`ClientInteractionManager.handleUnknownInteraction(): command cooldown triggered for user: ${unknown_interaction.user.id};`);

            return;
        }

        /* set the user on a cooldown for applicable interaction types */
        if (
            unknown_interaction.type === Discord.InteractionType.ApplicationCommand ||
            unknown_interaction.type === Discord.InteractionType.MessageComponent ||
            unknown_interaction.type === Discord.InteractionType.ModalSubmit
        ) {
            await ClientInteractionCooldownManager.setUserOnCooldown(unknown_interaction.user.id, client_interaction.cooldown_duration_ms);
        }

        /* log the interaction */
        if (unknown_interaction.isChatInputCommand()) {
            const current_timestamp = `${Date.now()}`.slice(0, -3);
            try {
                await sendWebhookMessage(anonymous_command_history_webhook_url, {
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Green,
                            fields: [
                                {
                                    name: 'Executed On',
                                    value: `<t:${current_timestamp}:f> (<t:${current_timestamp}:R>)`,
                                    inline: false,
                                }, {
                                    name: 'Command Run',
                                    value: [
                                        '\`\`\`',
                                        [
                                            `/${unknown_interaction.commandName}`,
                                            stringEllipses(stringifyOptions(unknown_interaction.options.data), 1024),
                                        ].join(' '),
                                        '\`\`\`',
                                    ].join('\n'),
                                    inline: false,
                                },
                            ],
                        }).toJSON(),
                    ],
                });
            } catch (error) {
                console.trace(error);
            }
        }

        /* run the interaction handler */
        try {
            console.log(`ClientInteractionManager.handleUnknownInteraction(): running handler for interaction: ${client_interaction.identifier}`);
            await client_interaction.handler(discord_client, unknown_interaction);
        } catch (error) {
            console.trace({
                unknown_interaction: unknown_interaction,
                client_interaction: client_interaction,
                error_message: error,
            });

            if (unknown_interaction.channel?.isTextBased()) {
                unknown_interaction.channel.send({
                    embeds: [
                        CustomEmbed.from({
                            color: CustomEmbed.Colors.Red,
                            title: 'Interaction Error',
                            description: `An error occurred while handling: \`${unknown_interaction_identifier}\`.`,
                            fields: [
                                {
                                    name: 'Error Message',
                                    value: [
                                        '\`\`\`',
                                        stringEllipses(Discord.escapeMarkdown(`${error}`), 1000),
                                        '\`\`\`',
                                    ].join('\n'),
                                },
                            ],
                        }),
                    ],
                }).catch(console.warn);
            }
        }
    }
}
