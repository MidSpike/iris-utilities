'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

//---------------------------------------------------------------------------------------------------------------//

const os = require('os');
os.setPriority(0, os.constants.priority.PRIORITY_HIGH);

const fs = require('fs');

const moment = require('moment-timezone');

//---------------------------------------------------------------------------------------------------------------//

const bot_config = require('./config.js');

const { Discord,
        client } = require('./src/libs/bot.js');

const { Timer,
        math_clamp,
        getReadableTime } = require('./src/utilities.js');

//---------------------------------------------------------------------------------------------------------------//

//#region bot files
const bot_command_log_file = process.env.BOT_COMMAND_LOG_FILE;
const bot_blacklisted_guilds_file = process.env.BOT_BLACKLISTED_GUILDS_FILE;
const bot_blacklisted_users_file = process.env.BOT_BLACKLISTED_USERS_FILE;
//#endregion bot files

//#region bot globals
const bot_owner_id = bot_config.OWNER_ID;
const bot_common_name = bot_config.COMMON_NAME;
const bot_version = bot_config.PUBLIC_VERSION;
const bot_website = bot_config.WEBSITE;
const bot_default_guild_config = bot_config.DEFAULT_GUILD_CONFIG;
const bot_support_guild_id = process.env.BOT_SUPPORT_GUILD_ID;
const bot_cdn_url = process.env.BOT_CDN_URL;
//#endregion bot globals

//#region bot channels
const bot_special_channels = bot_config.SPECIAL_CHANNELS;

const bot_backup_commands_channel = bot_special_channels.find(ch => ch.id === 'BOT_COMMANDS');

const bot_restart_log_channel = bot_special_channels.find(ch => ch.id === 'BOT_RESTARTS');
const bot_command_log_channel = bot_special_channels.find(ch => ch.id === 'GUILD_COMMANDS');
const bot_update_log_channel = bot_special_channels.find(ch => ch.id === 'BOT_UPDATES');
const bot_members_log_channel = bot_special_channels.find(ch => ch.id === 'GUILD_MEMBERS');
const bot_invite_log_channel = bot_special_channels.find(ch => ch.id === 'GUILD_INVITES');
const bot_moderation_log_channel = bot_special_channels.find(ch => ch.id === 'GUILD_MODERATION');
const bot_reaction_log_channel = bot_special_channels.find(ch => ch.id === 'GUILD_REACTIONS');
const bot_appeals_log_channel = bot_special_channels.find(ch => ch.id === 'GUILD_APPEALS');

const bot_central_guild_history_channel_id = process.env.BOT_LOGGING_CHANNEL_GUILD_HISTORY_ID;
const bot_central_anonymous_command_log_channel_id = process.env.BOT_LOGGING_CHANNEL_ANONYMOUS_COMMAND_LOG_ID;
//#endregion bot channels

//---------------------------------------------------------------------------------------------------------------//

const { CustomRichEmbed } = require('./src/libs/CustomRichEmbed.js');

const { logUserError } = require('./src/libs/errors.js');

const { generateInviteToGuild } = require('./src/libs/invites.js');

const { sendConfirmationMessage,
        logAdminCommandsToGuild } = require('./src/libs/messages.js');

const { QueueManager } = require('./src/libs/QueueManager.js');
const { AudioController } = require('./src/libs/AudioController.js');
const { VolumeManager } = require('./src/libs/VolumeManager.js');

const { isThisBot,
        isThisBotsOwner,
        isSuperPerson,
        isSuperPersonAllowed } = require('./src/libs/permissions.js');

const { getDiscordCommand,
        getDiscordCommandArgs,
        DisBotCommand,
        DisBotCommander,
        registerDisBotCommands } = require('./src/libs/DisBotCommander.js');

const { registerDisBotEvents } = require('./src/libs/events.js');

//---------------------------------------------------------------------------------------------------------------//

async function updateGuildConfig(guild) {
    if (!guild) {
        console.trace('MAJOR ISSUE: `guild` is not defined!');
        return;
    }

    if (!guild.available) {
        console.error(`Guild (${guild.id}) was not available!`);
        return;
    }

    if (guild.partial) await guild.fetch().catch((warning) => console.warn('1599589897074799491', warning));

    const old_guild_config = await client.$.guild_configs_manager.fetchConfig(guild.id);

    const new_guild_config = {
        ...{ // only write this info upon first addition to the config
            '_added_on': `${moment()}`,
            '_persistent_existence_count': 0, // [ -100 to 100 ]
            '_persistent_existence_mode': 'remove', // [ remove | preserve ]
        },
        ...bot_default_guild_config,
        ...old_guild_config,
        ...{ // update the following information
            '_last_seen_on': `${moment()}`,
            '_name': guild.name,
            '_region': guild.region,
            '_features': `${guild.features}`,
            '_owner': `@${guild.owner?.user?.tag} (${guild.owner?.id})`,
            '_has_permissions': `${guild.me.hasPermission('ADMINISTRATOR') ? 'ADMINISTRATOR' : guild.me.permissions.toArray()}`,
            '_member_count': guild.members.cache.filter(member => !member.user.bot).size,
            '_bot_count': guild.members.cache.filter(member => member.user.bot).size,
        },
    };

    client.$.guild_configs_manager.updateConfig(guild.id, new_guild_config);

    return; // complete async
}

async function initialize_guild_on_client_$(guild) {
    if (!guild) {
        console.trace('MAJOR ISSUE: Guild is not defined!');
        return;
    }

    if (!guild.available) {
        console.error(`Guild: ${guild.id} was not available!`);
        return;
    }

    if (guild.partial) await guild.fetch().catch((warning) => console.warn('1599589897074318280', warning));

    client.$.guild_lockdowns.set(guild.id, false);
    client.$.dispatchers.set(guild.id, undefined);
    client.$.queue_managers.set(guild.id, new QueueManager(guild));
    client.$.volume_managers.set(guild.id, new VolumeManager(guild));
    client.$.audio_controllers.set(guild.id, new AudioController(guild));

    return; // complete async
}

//---------------------------------------------------------------------------------------------------------------//

function checkForBlacklistedGuild(guild) {
    const blacklisted_guilds = JSON.parse(fs.readFileSync(bot_blacklisted_guilds_file));
    const guild_is_blacklisted = blacklisted_guilds.map(blacklisted_guild => blacklisted_guild.id).includes(guild?.id);
    return guild_is_blacklisted ? true : false;
}

async function checkForBlacklistedUser(message) {
    const blacklisted_users = JSON.parse(fs.readFileSync(bot_blacklisted_users_file));
    if (blacklisted_users.map(blacklisted_user => blacklisted_user.id).includes(message.author.id)) {
        /* prevent blacklisted users from using the bot */
        console.warn(`Blacklisted user tried using ${bot_common_name}: ${message.author.tag} (${message.author.id})`);
        const embed = new CustomRichEmbed({
            color: 0xFF00FF,
            title: `Sorry but you were blacklisted from using ${bot_common_name}!`,
            description: `You can try appealing in the ${bot_common_name} Support Server\n*(an invite is available on the [website](${bot_config.WEBSITE}))*`,
        });
        const dm_channel = await message.author.createDM().catch(() => {
            /* the bot is unable to DM to blacklisted user, so send it to the guild instead */
            message.channel.send(embed).catch(console.warn);
        });
        await dm_channel.send(embed).catch(console.warn);
        return true;
    } else {
        /* allow non-blacklisted users to use the bot */
        return false;
    }
}

//---------------------------------------------------------------------------------------------------------------//

client.once('ready', async () => {
    console.timeEnd(`client.login -> client#ready`);

    client.$.restarting_bot = true; // the bot is still restarting

    const ready_timestamp = moment(); // consider this timestamp as the official 'ready' event moment

    console.log(`----------------------------------------------------------------------------------------------------------------`);
    console.log(`${bot_common_name} Logged in as ${client.user.tag} on ${ready_timestamp} in ${client.guilds.cache.size} servers!`);
    console.log(`----------------------------------------------------------------------------------------------------------------`);

    /* after 1 minute, log to all subscribed servers that a restart has just occurred */
    client.setTimeout(() => {
        const guild_restart_logging_channels = client.channels.cache.filter(channel => channel.type === 'text' && channel.name === bot_restart_log_channel.name);
        guild_restart_logging_channels.forEach(channel => {
            if (channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
                channel.send(`${bot_common_name} restarted at ${ready_timestamp}!`).catch(console.warn);
            } else {
                console.warn(`Unable to send restart message to ${channel.name} (${channel.id}) > ${channel.guild.name} (${channel.guild.id})`);
            }
        });
    }, 1000 * 60 * 1); // 1 minute

    /* after 5 minutes, update the client presence with various helpful information */
    client.setTimeout(async () => {
        let bot_presence_mode = 1;
        client.setInterval(async () => {
            let bot_presence_text;
            switch (bot_presence_mode) {
                case 0:
                    bot_presence_text = `@${client.user.tag}`;
                    break;
                case 1:
                    bot_presence_text = `Uptime: ${getReadableTime(client.uptime / 1000)}`;
                    break;
                case 2:
                    bot_presence_text = `👨‍💻${(await client.users.fetch(bot_owner_id)).tag}👑`;
                    break;
                case 3:
                    bot_presence_text = `@mention me for help!`;
                    break;
                case 4:
                    bot_presence_text = `${bot_version}`;
                    break;
                case 5:
                    bot_presence_text = `in ${client.guilds.cache.size} servers!`;
                    break;
                case 6:
                    bot_presence_text = `with ${client.users.cache.filter(user => !user.bot).size} people!`;
                    break;
            }
            bot_presence_mode += (bot_presence_mode < 6 ? 1 : -6); // incrementally loop the presence mode
            client.user.setPresence({
                status: 'online',
                type: 4,
                activity: {
                    type: 'PLAYING',
                    name: `${bot_presence_text}`,
                },
            });
        }, 1000 * 15); // 2) then cycle every 15 seconds
    }, 1000 * 60 * 5); // 1) wait for 5 minutes

    /* propagate guild configs and `client.$` */
    async function propagate_guilds() {
        console.time(`propagate_guilds()`);
        for (const guild of client.guilds.cache.values()) {
            await initialize_guild_on_client_$(guild);
            await updateGuildConfig(guild);
        }
        console.timeEnd(`propagate_guilds()`);
    }
    client.setImmediate(() => propagate_guilds()); // immediately after a restart

    /* update guild configs every 15 minutes to keep an updated record */
    async function update_guild_configs() {
        console.time(`update_guild_configs()`);
        for (const guild of client.guilds.cache.values()) {
            await updateGuildConfig(guild);
        }
        console.timeEnd(`update_guild_configs()`);
    }
    client.setInterval(() => update_guild_configs(), 1000 * 60 * 15); // every 15 minutes

    /* consider guilds that the bot cannot access as non-existent */
    async function track_guild_existences() {
        console.time(`track_guild_existences()`);
        const all_guild_configs = client.$.guild_configs_manager.configs;
        for (const guild_id of all_guild_configs.keys()) {
            const guild_exists_to_the_bot = !!client.guilds.resolve(guild_id);
            const guild_config = await client.$.guild_configs_manager.fetchConfig(guild_id);
            const old_guild_persistent_existence_count = guild_config._persistent_existence_count ?? 0;
            const new_guild_persistent_existence_count = math_clamp(old_guild_persistent_existence_count + (guild_exists_to_the_bot ? 1 : -1), -100, 100);

            await client.$.guild_configs_manager.updateConfig(guild_id, {
                '_persistent_existence_count': new_guild_persistent_existence_count,
            });

            if (new_guild_persistent_existence_count === -100 && guild_config._persistent_existence_mode === 'remove') {
                await client.$.guild_configs_manager.removeConfig(guild_id);
                console.warn(`Guild (${guild_id}) has been automatically removed from the guild configs!`);
            }
        }
        console.timeEnd(`track_guild_existences()`);
    }
    client.setInterval(() => track_guild_existences(), 1000 * 60 * 15); // every 15 minutes

    /* save the guild configs 1 minute after a restart */
    client.setTimeout(() => client.$.guild_configs_manager.saveConfigs(), 1000 * 60 * 1);

    /* finish up preparing the bot */
    client.$.restarting_bot = false; // the bot can be considered done restarting
});

//---------------------------------------------------------------------------------------------------------------//

client.on('guildUpdate', async (old_guild, new_guild) => {
    if (client.$.restarting_bot) return;

    if (new_guild.partial) await new_guild.fetch().catch((warning) => console.warn('1599589897074706177', warning));

    updateGuildConfig(new_guild);
});

client.on('guildCreate', async (guild) => {
    if (guild.partial) guild.fetch().catch((warning) => console.warn('1599589897074386511', warning));

    /* log to the central logging server when a guild adds the bot to it */
    const central_guild_history_logging_channel = client.channels.resolve(bot_central_guild_history_channel_id);
    if (central_guild_history_logging_channel) {
        central_guild_history_logging_channel.send(new CustomRichEmbed({
            color: 0x00FF00,
            author: {
                iconURL: guild.iconURL(),
                name: `${guild.name} (${guild.id})`,
            },
            title: `Added ${bot_common_name}!`,
            footer: {
                iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                text: `${moment()}`,
            },
        })).catch(console.warn);
    }

    /* prepare the guild for configs and other runtime variables */
    await updateGuildConfig(guild);
    await initialize_guild_on_client_$(guild);

    /* send the new guild help information to the most probable general-channel in the guild */
    if (guild.memberCount < 1000) {
        const bot_support_guild_invite = await generateInviteToGuild(bot_support_guild_id, 'Generated by: guildCreate').catch(console.trace);
        const viewable_text_channels = guild.channels.cache.filter(c => c.type === 'text' && c.viewable && c.permissionsFor(guild.me).has('SEND_MESSAGES'));
        const potential_bot_commands_channel = viewable_text_channels.filter(c => ['bot-commands', 'commands', 'bot'].includes(c.name)).first();
        const potential_general_channel = viewable_text_channels.filter(c => ['general-chat', 'general', 'chat'].includes(c.name)).first();
        const fallback_first_available_channel = viewable_text_channels.first();
        const channel_to_send_initial_message = potential_general_channel ?? potential_bot_commands_channel ?? fallback_first_available_channel ?? undefined;
        const new_guild_information_embed = new CustomRichEmbed({
            title: `Hello there ${guild.name}!`,
            description: [
                `**Thank you for adding me!**`,
                `My command prefix is \`${bot_default_guild_config.command_prefix}\` by default!`,
                `You can use \`${bot_default_guild_config.command_prefix}help\` or \`${bot_default_guild_config.command_prefix}all_commands\` to see a list of commands that you can use.`,
                `You can **directly message** me to get in touch with my [Support Staff](${bot_support_guild_invite.url})!`,
                `I function most **optimally** with the **ADMINISTRATOR** permission given to me; however, **ADMINISTRATOR is not required** for me to work!`,
                `There are **special channels** that I can operate for you, use the \`${bot_default_guild_config.command_prefix}create_special_channels\` command to have me automatically create them for you!`,
                `There might be [additional information on the website](${bot_website}) that may be useful to you!`,
            ].join(`\n\n`),
            image: `${bot_cdn_url}/new_guild_information_2020-06-27_1.png`,
        });
        try {
            await channel_to_send_initial_message?.send(new_guild_information_embed);
        } catch {
            console.warn(`Failed to send new guild information for ${guild.name} (${guild.id}) to the guild!`);
        }
    }
});

client.on('guildDelete', async (guild) => {
    if (guild.partial) guild.fetch().catch((warning) => console.warn('1599589897074228380', warning));

    /* log to the central logging server when a guild removes the bot from it */
    const central_guild_history_logging_channel = client.channels.resolve(bot_central_guild_history_channel_id);
    if (central_guild_history_logging_channel) {
        central_guild_history_logging_channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            author: {
                iconURL: guild.iconURL(),
                name: `${guild?.name} (${guild?.id})`,
            },
            title: `Removed ${bot_common_name}!`,
            footer: {
                iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                text: `${moment()}`,
            },
        })).catch(console.warn);
    }
});

//---------------------------------------------------------------------------------------------------------------//

client.on('channelCreate', async (channel) => {
    if (client.$.restarting_bot) return;

    if (channel.type !== 'text') return;

    const guild_config = await client.$.guild_configs_manager.fetchConfig(channel.guild.id);
    const command_prefix = guild_config.command_prefix;

    /**
     * Prevents everyone except this bot from sending messages in the channel
     * @param {GuildTextChannel} channel a GuildTextChannel
     */
    function prevent_sending_messages_in_channel(channel) {
        channel.overwritePermissions([
            {
                id: channel.guild.roles.everyone.id,
                deny: ['SEND_MESSAGES'],
            }, {
                /* Make sure that the bot retains access if `ADMINISTRATOR` is not present */
                id: channel.guild.me.id,
                allow: ['SEND_MESSAGES'],
            },
        ], `Don't allow people to send messages in a logging channel!`).catch(() => {
            channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'There is an issue!',
                description: 'I was unable to modify the permissions of this channel to only allow myself to send messages in it!',
            })).catch(console.warn);
        });
    }
    switch (channel.name) {
        case bot_backup_commands_channel.name:
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: `Any ${bot_common_name} commands can be used here by people with appropriate permissions!`,
            })).catch(console.warn);
            break;
        case bot_appeals_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: `Now syncing future \`${command_prefix}ban\` command appeal messages to this channel!`,
            })).catch(console.warn);
            channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Warning!',
                description: 'This feature is in BETA!',
            })).catch(console.warn);
            break;
        case bot_restart_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future bot restart history to channel!',
            })).catch(console.warn);
            break;
        case bot_update_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future bot update history to channel!',
            })).catch(console.warn);
            break;
        case bot_command_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future guild command history to channel!',
            })).catch(console.warn);
            break;
        case bot_moderation_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future guild moderation history to channel!',
            })).catch(console.warn);
            break;
        case bot_invite_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future guild invite history to channel!',
            })).catch(console.warn);
            channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Warning!',
                description: 'If I don\'t have the \`MANAGE_GUILD\` and \`VIEW_AUDIT_LOG\` permissions, I will need them to see invite events for all channels!',
            })).catch(console.warn);
            break;
        case bot_members_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future guild member join/leave history to channel!',
            })).catch(console.warn);
            break;
        case bot_reaction_log_channel.name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title: 'Channel Linked',
                description: 'Now syncing future guild message reaction history to channel!',
            })).catch(console.warn);
            channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Warning!',
                description: 'Any reactions manipulated by bots will not be logged for performance reasons!',
            })).catch(console.warn);
            break;
    }
});

//---------------------------------------------------------------------------------------------------------------//

client.on('guildMemberAdd', async (member) => {
    if (client.$.restarting_bot) return;

    if (isThisBot(member.id)) return; // don't log this bot leaving

    if (member.user.partial) member.user.fetch().catch((warning) => console.warn('1599589897074279134', warning));

    const logging_channel = member.guild.channels.cache.find(channel => channel.name === bot_members_log_channel.name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color: 0x00FF00,
        author: {
            iconURL: member.user.displayAvatarURL({ dynamic: true }),
            name: `@${member.user.tag} (${member.user.id})`,
        },
        description: [
            `**User**: ${member.user}`,
            `**Creation**: ${moment(member.user.createdTimestamp).format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ')}`,
            `**Flags**: \`${member.user.flags.toArray().join(', ')}\``,
        ].join('\n'),
        footer: {
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
            text: `Joined • ${moment()}`,
        },
    })).catch(() => {
        console.warn(`Unable to send \'guildMemberAdd\' message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

client.on('guildMemberRemove', async (member) => {
    if (client.$.restarting_bot) return;

    if (isThisBot(member.id)) return; // don't log this bot leaving

    if (member.user.partial) member.user.fetch().catch((warning) => console.warn('1599589897074661817', warning));

    const logging_channel = member.guild.channels.cache.find(channel => channel.name === bot_members_log_channel.name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color: 0xFFFF00,
        author: {
            iconURL: member.user.displayAvatarURL({ dynamic: true }),
            name: `@${member.user.tag} (${member.user.id})`,
        },
        description: [
            `**User**: ${member.user}`,
            `**Creation**: ${moment(member.user.createdTimestamp).format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ')}`,
            `**Flags**: \`${member.user.flags.toArray().join(', ')}\``,
        ].join('\n'),
        footer: {
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
            text: `Left • ${moment()}`,
        },
    })).catch(() => {
        console.warn(`Unable to send \'guildMemberRemove\' message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

//---------------------------------------------------------------------------------------------------------------//

client.on('messageReactionAdd', async (reaction, user) => {
    if (client.$.restarting_bot) return;

    if (reaction.partial) await reaction.fetch().catch((warning) => console.warn('1599589897074362466', warning));
    if (reaction.message.partial) await reaction.message.fetch().catch((warning) => console.warn('1599589897074415111', warning));
    if (user.partial) await user.fetch().catch((warning) => console.warn('1599589897074338603', warning));

    if (user.bot) return; // don't log bots
    if (!reaction.message.guild) return; // don't continue with direct message reactions

    const logging_channel = reaction.message.guild.channels.cache.find(channel => channel.name === bot_reaction_log_channel.name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color: 0x00FF00,
        author: {
            iconURL: user.displayAvatarURL({ dynamic: true }),
            name: `@${user.tag} (${user.id})`,
        },
        title: 'Added A Message Reaction',
        description: [
            `Message: [Message Link](${reaction.message.url})`,
            `Reaction Id: \`${reaction.emoji.id}\``,
            `Reaction Markup: \`${reaction.emoji}\``,
            `Reaction Emoji: ${reaction.emoji}`,
        ].join('\n'),
        footer: {
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
            text: `${moment()}`,
        },
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (client.$.restarting_bot) return;

    if (reaction.partial) await reaction.fetch().catch((warning) => console.warn('1599589897074335802', warning));
    if (reaction.message.partial) await reaction.message.fetch().catch((warning) => console.warn('1599589897074481368', warning));
    if (user.partial) await user.fetch().catch((warning) => console.warn('1599589897074623501', warning));

    if (user.bot) return; // don't log bots
    if (!reaction.message.guild) return; // don't continue with direct message reactions

    const logging_channel = reaction.message.guild.channels.cache.find(channel => channel.name === bot_reaction_log_channel.name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color: 0xFFFF00,
        author: {
            iconURL: user.displayAvatarURL({ dynamic: true }),
            name: `@${user.tag} (${user.id})`,
        },
        title: 'Removed A Message Reaction',
        description: [
            `Message: [Message Link](${reaction.message.url})`,
            `Reaction Id: \`${reaction.emoji.id}\``,
            `Reaction Markup: \`${reaction.emoji}\``,
            `Reaction Emoji: ${reaction.emoji}`,
        ].join('\n'),
        footer: {
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
            text: `${moment()}`,
        },
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

//---------------------------------------------------------------------------------------------------------------//

client.on('inviteCreate', async (invite) => {
    if (client.$.restarting_bot) return;

    if (!invite.channel?.guild) return; // make sure that invite is for a guild

    const logging_channel = invite.channel.guild.channels.cache.find(channel => channel.name === bot_invite_log_channel.name);
    if (!logging_channel) return;

    logging_channel.send(new CustomRichEmbed({
        color: 0x00FF00,
        title: 'An Invite Has Been Created!',
        fields: [
            {
                name: 'Created By',
                value: `${invite.inviter ?? `\`N/A\``}`,
            }, {
                name: 'Invite Code',
                value: `\`${invite.code}\``,
            }, {
                name: 'Invite URL',
                value: `<${invite.url}>`,
            },
        ],
    })).catch(() => {
        console.warn(`Unable to send \'inviteCreate\' message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

client.on('inviteDelete', async (invite) => {
    if (client.$.restarting_bot) return;

    if (!invite.channel?.guild) return; // make sure that invite is for a guild

    const logging_channel = invite.channel.guild.channels.cache.find(channel => channel.name === bot_invite_log_channel.name);
    if (!logging_channel) return;

    const guild_audit_logs = await invite.channel.guild.fetchAuditLogs({
        limit: 1,
        type: 'INVITE_DELETE'
    }).catch((warning) => console.warn('1599589897074427896', warning));
    const audit_log_deleted_invite = guild_audit_logs?.entries?.first();
    const person_to_blame = audit_log_deleted_invite?.executor ?? `\`N/A\``;

    logging_channel.send(new CustomRichEmbed({
        color: 0xFFFF00,
        title: 'An Invite Has Been Deleted!',
        fields: [
            {
                name: 'Deleted By',
                value: `${audit_log_deleted_invite ? person_to_blame : `${'```'}fix\nI need the \`VIEW_AUDIT_LOG\` permission to tell you who!\n${'```'}`}`,
            }, {
                name: 'Invite Code',
                value: `\`${invite.code}\``,
            }, {
                name: 'Invite URL',
                value: `~~<${invite.url}>~~`,
            },
        ],
    })).catch(() => {
        console.warn(`Unable to send 'inviteDelete' message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

//---------------------------------------------------------------------------------------------------------------//

/* automatic addition of roles */
client.on('guildMemberAdd', async (member) => {
    if (client.$.restarting_bot) return;

    if (member.partial) await member.fetch().catch((warning) => console.warn('1599589897074140652', warning));

    const guild_config = await client.$.guild_configs_manager.fetchConfig(member.guild.id)
    const auto_roles = guild_config.new_member_roles ?? [];
    if (auto_roles.length > 0 && member.guild.me.hasPermission('MANAGE_ROLES')) {
        await Timer(1000); // prevent API abuse
        member.roles.add(auto_roles, 'Adding Auto Roles');
    }
});

//---------------------------------------------------------------------------------------------------------------//

/* direct messages with the bot support server */
client.on('message', async (message) => {
    if (client.$.restarting_bot) return;

    /* handle potential partial data structures */
    if (message.partial) await message.fetch().catch((warning) => console.warn('1599589897074120198', warning));
    if (message.author?.partial) await message.author.fetch().catch((warning) => console.warn('1599589897074640420', warning));
    if (message.guild) await message.guild.fetch().catch((warning) => console.warn('1599589897074678159', warning));

    /* don't interact with bots */
    if (message.author.bot) return;

    /* don't continue when the bot is in lockdown mode */
    if (client.$.lockdown_mode && !isThisBotsOwner(message.author.id)) return;

    if (message.channel.type === 'text' && message.channel.parentID === process.env.CENTRAL_DM_CHANNELS_CATEGORY_ID) {
        const user_to_dm_from_dm_channel = client.users.cache.get(`${message.channel.name.replace('dm-', '')}`);
        if (!user_to_dm_from_dm_channel) return;
        const dm_embed = new CustomRichEmbed({
            author: {
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
                name: `@${message.author.tag} (${message.author.id})`,
            },
            description: `${message.cleanContent}`,
            fields: [
                ...(message.attachments.size > 0 ? message.attachments.map(attachment => ({
                    name: `Message Attachment:`,
                    value: `[${attachment.name}](${attachment.url}) (${attachment.id}) ${attachment.size} bytes`,
                })) : []),
            ],
            footer: {
                iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                text: `Support Staff: ${moment()}`,
            },
        });

        if (message.attachments.size === 0) {
            await message.delete({ timeout: 500 }).catch(error => console.warn(`Unable to delete message`, error));
        }

        try {
            const dm_channel = await user_to_dm_from_dm_channel.createDM();
            await dm_channel.send(dm_embed);
            await message.channel.send(dm_embed);
        } catch {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Unable to send messages to this user!',
            })).catch(console.warn);
        }
    }

    if (message.channel.type === 'dm') {
        const confirmation_embed = new CustomRichEmbed({
            title: `Do you wish to send that message to my support staff?`,
            description: [
                'My staff will answer any questions as soon as they see it!',
                'Remember that you can request for your history to be deleted at any time!',
            ].join('\n\n'),
        });

        sendConfirmationMessage(message.author.id, message.channel.id, true, confirmation_embed, async () => {
            const bot_support_guild = client.guilds.cache.get(bot_support_guild_id);

            let support_guild_dm_channel_with_user = bot_support_guild.channels.cache.find(channel => channel.type === 'text' && channel.name === `dm-${message.author.id}`);

            if (!support_guild_dm_channel_with_user) {
                /* create the linking support channel if it doesn't already exist */
                support_guild_dm_channel_with_user = await bot_support_guild.channels.create(`dm-${message.author.id}`, {
                    type: 'text',
                    topic: `${message.author.tag} (${message.author.id}) | ${moment()}`,
                }).catch(console.trace);

                await support_guild_dm_channel_with_user.setParent(process.env.CENTRAL_DM_CHANNELS_CATEGORY_ID).catch(console.trace);
                await Timer(1000); // discord.js needs time to recognize the new parent of the channel
                await support_guild_dm_channel_with_user.lockPermissions().catch(console.trace);
            }

            await support_guild_dm_channel_with_user.send(new CustomRichEmbed({
                color: 0xBBBBBB,
                author: {
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    name: `@${message.author.tag} (${message.author.id})`,
                },
                description: `${message.cleanContent}`,
                fields: [
                    { name: `Link`, value: `[Direct Message Link](${message.url.replace('@me', client.user.id)})` },
                    ...(message.attachments.size > 0 ? message.attachments.map(attachment => ({
                        name: `Message Attachment:`,
                        value: `[${attachment.name}](${attachment.url}) (${attachment.id}) ${attachment.size} bytes`,
                    })) : []),
                ],
                footer: {
                    iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                    text: `Direct Message: ${moment()}`,
                },
            })).catch(console.warn);

            await message.channel.send(new CustomRichEmbed({
                author: {
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    name: `@${message.author.tag}`,
                },
                description: `I sent [this message](${message.url}) to my support staff!`,
            }));
        }, undefined);
    }
});

//---------------------------------------------------------------------------------------------------------------//

client.on('message', async (message) => {
    /* handle potential partial data structures */
    if (message.partial) await message.fetch().catch((warning) => console.warn('1599589897074884457', warning));
    if (message.author?.partial) await message.author.fetch().catch((warning) => console.warn('1599589897074181056', warning));
    if (message.member?.partial) await message.member.fetch().catch((warning) => console.warn('1599589897074955328', warning));
    if (message.guild) await message.guild.fetch().catch((warning) => console.warn('1599589897074775229', warning));

    /* don't continue if the message is empty and there aren't any attachments */
    if (message.content.trim().length === 0 && message.attachments.size === 0) return;

    /* don't interact with other bots */
    if (message.author.bot) return;

    /* don't continue when the bot is in lockdown mode */
    if (client.$.lockdown_mode && !isThisBotsOwner(message.author.id)) return;

    /* make sure that the message is from a guild text-channel */
    if (message.channel.type !== 'text') return;

    /********************************************************************
     * the bot is being used in a guild text-channel after this comment *
     ********************************************************************/

    /* don't continue when the guild is in lockdown mode */
    const guild_lockdown_mode = client.$.guild_lockdowns.get(message.guild.id);
    if (guild_lockdown_mode && !isThisBotsOwner(message.author.id)) return;

    /* fetch the guild config */
    const guild_config = await client.$.guild_configs_manager.fetchConfig(message.guild.id);

    /* fetch the guild command prefix */
    const command_prefix = (guild_config.command_prefix ?? bot_default_guild_config.command_prefix)?.toLowerCase();

    /* confirm that the guild command prefix is valid prefix */
    if (typeof command_prefix !== 'string' || command_prefix.length === 0) {
        console.error(`Guild (${message.guild.id}) has an invalid command prefix: ${command_prefix}; manual fixing is required!`);
        return;
    }

    /* don't allow blacklisted guilds and silently halt execution */
    if (checkForBlacklistedGuild(message.guild)) return;

    /* handle guild invite-blocking */
    const guild_invite_blocking_enabled = guild_config.invite_blocking === 'enabled';
    const contains_invite_link = message.cleanContent.includes(`discord.gg/`) || message.cleanContent.includes('discord.com/invite/') || message.cleanContent.includes(`discord.io/`) || message.cleanContent.includes(`invite.gg/`);
    if (guild_invite_blocking_enabled && contains_invite_link) {
        if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            const _member_is_immune = message.member.hasPermission('ADMINISTRATOR');
            message.channel.send(new CustomRichEmbed({
                color: (_member_is_immune ? 0x00FF00 : 0xFFFF00),
                author: {
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    name: `@${message.author.tag} (${message.author.id})`,
                },
                title: 'Woah there!',
                description: `Sending discord invites is not allowed in this guild${_member_is_immune ? ', but you are immune!' : '!'}`,
            })).catch(console.warn);
            if (!_member_is_immune) {
                await message.delete({ timeout: 250 }).catch(error => console.warn(`Unable to delete message`, error));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFF0000,
                title: 'An error has occurred!',
                description: `This guild has invite blocking enabled, but I do not have the permission \`MANAGE_MESSAGES\` to delete messages containing discord invites.`,
            })).catch(console.warn);
        }
    }

    /* handle guild url-blocking */
    const guild_url_blocking_enabled = guild_config.url_blocking === 'enabled';
    const contains_url = new RegExp('([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?').test(message.cleanContent);
    if (guild_url_blocking_enabled && contains_url) {
        if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            const _member_is_immune = message.member.hasPermission('ADMINISTRATOR');
            message.channel.send(new CustomRichEmbed({
                color: (_member_is_immune ? 0x00FF00 : 0xFFFF00),
                author: {
                    iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    name: `@${message.author.tag} (${message.author.id})`,
                },
                title: 'Woah there!',
                description: `Sending links is not allowed in this guild${_member_is_immune ? ', but you are immune!' : '!'}`,
            })).catch(console.warn);
            if (!_member_is_immune) {
                await message.delete({ timeout: 250 }).catch(error => console.warn(`Unable to delete message`, error));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFF0000,
                title: 'An error has occurred!',
                description: `This guild has url blocking enabled, but I do not have the permission \`MANAGE_MESSAGES\` to delete messages containing urls.`,
            })).catch(console.warn);
        }
    }

    /* handle messages that start with a @mention of this bot */
    if (message.content.startsWith(`<@!${client.user.id}>`)) {
        const quick_help_embed = new CustomRichEmbed({
            title: `Hi there ${message.author.username}!`,
            description: [
                `My command prefix is \`${command_prefix}\` in **${message.guild.name}**.`,
                `Use \`${command_prefix}help\` in that server to get started!`,
            ].join('\n'),
        });
        try {
            await message.channel.send(quick_help_embed);
        } catch {
            const dm_channel = await message.author.createDM();
            dm_channel.send(quick_help_embed).catch(console.warn);
        }
        return;
    }

    /* check to see if the message starts with the command prefix */
    if (!message.content.toLowerCase().startsWith(command_prefix)) return;

    /* prevent bot-list guilds from responding to the default command_prefix */
    const guild_is_a_known_bot_list = bot_config.BOT_LIST_GUILDS.includes(message.guild.id);
    const guild_is_an_unknown_bot_list = guild_config._bot_count > 250;
    const guild_command_prefix_is_default = guild_config.command_prefix.toLowerCase() === bot_default_guild_config.command_prefix.toLowerCase();
    if ((guild_is_a_known_bot_list || guild_is_an_unknown_bot_list) && guild_command_prefix_is_default) {
        console.error(`Guild [${message.guild.name}] (${message.guild.id}) should not have the default command_prefix!`);
        return;
    }

    /**********************************************
     * start handling commands after this comment *
     **********************************************/

    /* setup command constants */
    const command_timestamp = moment();
    const discord_command = getDiscordCommand(message.content);
    const command_args = getDiscordCommandArgs(message.content);
    const clean_command_args = getDiscordCommandArgs(message.cleanContent);
    const discord_command_without_prefix = discord_command.replace(`${command_prefix}`, ``);

    /* prevent false positives for non-command matches */
    if (discord_command_without_prefix.match(/^\d/)) return; // commands can't start with numbers

    /* check for guild allowed channels */
    const guild_allowed_channels = guild_config.allowed_channels;
    const fetched_allowed_channels = await Promise.all(guild_allowed_channels.map(async channel_id => await message.guild.channels.resolve(channel_id)?.fetch()));
    const is_not_backup_commands_channel = message.channel.name !== bot_backup_commands_channel.name;
    const is_guild_allowed_channel = guild_allowed_channels.includes(message.channel.id);
    const member_is_immune_from_channel_exclusions = message.member.hasPermission('ADMINISTRATOR');
    if (guild_allowed_channels.length > 0 && is_not_backup_commands_channel && !is_guild_allowed_channel && !member_is_immune_from_channel_exclusions) {
        const dm_channel = await message.author.createDM();
        dm_channel.send(new CustomRichEmbed({
            title: `Sorry you aren't allowed to use ${bot_common_name} commands in that channel.`,
            description: `The server you tried using me in has setup special channels for me to be used in!`,
            fields: [
                {
                    name: 'Allowed Channels',
                    value: `${'```'}\n${fetched_allowed_channels.map(channel => `#${channel.name} (${channel.id})`).join('\n')}\n${'```'}`,
                }, {
                    name: 'Notice',
                    value: `Anyone can use ${bot_common_name} commands in text-channels called \`#${bot_backup_commands_channel.name}\`.`,
                }, {
                    name: 'Notice',
                    value: `Members with the \`ADMINISTRATOR\` permission can use ${bot_common_name} commands in any text-channel.`,
                },
            ],
        })).catch(console.warn);
        return;
    }

    /* check for valid command */
    const command = DisBotCommander.commands.find(cmd => 
        cmd.aliases.map(cmd => 
            `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`
        ).includes(discord_command)
    );

    if (!command) {
        message.channel.send(new CustomRichEmbed({
            title: `That command doesn't exist!`,
            description: `Try \`${command_prefix}help\` for a list of commands!\n\nIf \`${command_prefix}\` is being used by another bot, use the command below to change ${bot_common_name} command prefix!`,
            fields: [
                {
                    name: `How to change ${bot_common_name} command prefix`,
                    value: `${'```'}\n${command_prefix}set_prefix NEW_PREFIX_HERE\n${'```'}`,
                },
            ],
        }, message)).catch(console.warn);
        return;
    }

    /* block commands when restarting */
    if (client.$.restarting_bot) {
        message.channel.send(new CustomRichEmbed({
            color: 0xFF00FF,
            title: `You currently can't use ${bot_common_name}!`,
            description: `${bot_common_name} is restarting for updates right now!\nCheck back in 5 minutes to see if the updates are done.`,
        }, message)).catch(console.warn);
        return;
    }

    /* central command logging */
    try {
        const current_command_log_file_name = bot_command_log_file.replace('#{date}', `${moment().format(`YYYY-MM`)}`);
        const command_log_file_exists = fs.existsSync(current_command_log_file_name);
        const current_command_logs = command_log_file_exists ? JSON.parse(fs.readFileSync(current_command_log_file_name)) : [];
        const command_log_entry = {
            guild: `[${message.guild.name}] (${message.guild.id})`,
            user: `[@${message.author.tag}] (${message.author.id})`,
            text_channel: `[#${message.channel.name}] (${message.channel.id})`,
            voice_channel: `[${message.member.voice?.channel?.name}] (${message.member.voice?.channel?.id})`,
            timestamp: `${command_timestamp}`,
            command: `${message.content}`,
        };
        console.info({ command_log_entry });
        const updated_command_log = [...current_command_logs, command_log_entry];
        fs.writeFileSync(current_command_log_file_name, JSON.stringify(updated_command_log, null, 2), { flag: 'w' });
    } catch (error) {
        console.trace(`Unable to save to command log file!`, error);
    }

    /* don't allow blacklisted users and notify them of their inability to use this bot */
    if (await checkForBlacklistedUser(message)) return;

    /* command message removal */
    if (message.deletable && message.attachments.size === 0 && guild_config.command_message_removal === 'enabled') {
        message.delete({ timeout: 500 }).catch(error => console.warn(`Unable to delete message`, error));
    }

    /* central anonymous command logging for bot staff */
    const anonymous_command_log_entry = {
        timestamp: `${command_timestamp}`,
        command: `${message.content}`,
    };
    const central_anonymous_command_logging_channel = client.channels.cache.get(bot_central_anonymous_command_log_channel_id);
    central_anonymous_command_logging_channel.send(`${'```'}json\n${JSON.stringify(anonymous_command_log_entry, null, 2)}\n${'```'}`).catch(console.trace);

    /* guild command logging */
    const guild_command_logging_channel = message.guild.channels.cache.find(channel => channel.type === 'text' && channel.name === bot_command_log_channel.name);
    if (guild_command_logging_channel) {
        guild_command_logging_channel.send(new CustomRichEmbed({
            author: {
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
                name: `@${message.author.tag} (${message.author.id})`,
            },
            title: 'Command Used',
            description: `${'```'}\n${message.content}\n${'```'}`,
            footer: {
                iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
                text: `${command_timestamp}`,
            },
        })).catch(console.warn);
    }

    //#region configure permission handlers for the command
    const hasGuildModeratorRole = message.member.roles.cache.filter(role => guild_config.moderator_roles?.includes(role.id)).size > 0;
    const hasGuildAdminRole = message.member.roles.cache.filter(role => guild_config.admin_roles?.includes(role.id)).size > 0;
    const isGuildModeratorWorthy = hasGuildModeratorRole;
    const isGuildAdminWorthy = hasGuildAdminRole || message.member.hasPermission('ADMINISTRATOR');
    const isGuildOwnerWorthy = message.member.id === message.guild.ownerID;
    const isSuperWorthy = isSuperPersonAllowed(isSuperPerson(message.member.id), 'guild_super_user');
    const isOwnerWorthy = isThisBotsOwner(message.member.id);

    /* set the command author's access_level for each level of worthiness */
    let command_author_access_level = DisBotCommand.access_levels.GLOBAL_USER;
    if (isGuildModeratorWorthy) command_author_access_level = DisBotCommand.access_levels.GUILD_MOD;
    if (isGuildAdminWorthy) command_author_access_level = DisBotCommand.access_levels.GUILD_ADMIN;
    if (isGuildOwnerWorthy) command_author_access_level = DisBotCommand.access_levels.GUILD_OWNER;
    if (isSuperWorthy) command_author_access_level = DisBotCommand.access_levels.BOT_SUPER;
    if (isOwnerWorthy) command_author_access_level = DisBotCommand.access_levels.BOT_OWNER;

    /* compare the required access level for the command with the command author's access_level */
    if (command_author_access_level < command.access_level) { // the user doesn't have permission to use this command
        if (command.access_level < DisBotCommand.access_levels.BOT_SUPER) {
            /* a restricted guild command has been attempted */
            message.channel.send(new CustomRichEmbed({
                color: 0xFF00FF,
                title: 'Sorry, but you do not have permission to use this command!',
                description: [
                    `**Your access level:** ${command_author_access_level}`,
                    `**Required access level:** ${command.access_level}`,
                    '**You must ascend in order to obtain the power that you desire!**',
                    '*If you are a part of this server\'s staff, try telling your server\'s Administrators about the commands below!*',
                ].join('\n'),
                fields: [
                    {
                        name: 'Setting Up Moderator Roles',
                        value: `${'```'}\n${command_prefix}set_moderator_roles @role1 @role2 @role3 ...\n${'```'}`,
                    }, {
                        name: 'Setting Up Admin Roles',
                        value: `${'```'}\n${command_prefix}set_admin_roles @role1 @role2 @role3 ...\n${'```'}`,
                    },
                ],
            }, message)).catch(console.warn);
        } else {
            /* a super or bot owner command has been attempted */
            message.channel.send(new CustomRichEmbed({
                color: 0xFF00FF,
                title: `Oi there, you thought this command wasn't protected?`,
                description: [
                    `**Your access level:** ${command_author_access_level}`,
                    `**Required access level:** ${command.access_level}`,
                    `**You must ascend in order to obtain the power that you desire!**`,
                ].join('\n'),
            }, message)).catch(console.warn);
        }
    } else { // the user has permission to use this command
        /* log any commands residing in the ADMINISTRATOR or GUILD_SETTINGS categories, to the guild */
        if ([DisBotCommander.categories.GUILD_ADMIN, DisBotCommander.categories.GUILD_SETTINGS].includes(command.category)) {
            logAdminCommandsToGuild(message);
        }
        /* attempt to execute the command, if anything unexpectedly goes wrong; it will logUserError */
        try {
            await command.execute(Discord, client, message, {
                command_prefix: `${command_prefix}`,
                discord_command: discord_command,
                command_args: command_args,
                clean_command_args: clean_command_args,
            });
        } catch (error) {
            logUserError(message, error);
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

/* register the commands */
registerDisBotCommands();

/* register the events */
registerDisBotEvents();

//---------------------------------------------------------------------------------------------------------------//

/* prevent the bot from crashing for unhandledRejections */
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('unhandledRejection at:', reason?.stack ?? reason, promise);
    console.error('----------------------------------------------------------------------------------------------------------------');
});

/* prevent the bot from crashing for uncaughtExceptions */
process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('uncaughtException at:', error);
    console.error('----------------------------------------------------------------------------------------------------------------');
});
