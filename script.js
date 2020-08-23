'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*

//---------------------------------------------------------------------------------------------------------------//

const os = require('os'); os.setPriority(0, os.constants.priority.PRIORITY_HIGH);
const fs = require('fs');
const path = require('path');
const recursiveReadDirectory = require('recursive-read-directory');

const moment = require('moment-timezone');

const { Discord, client } = require('./src/bot.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_config = require('./config.json');
const { Timer } = require('./utilities.js');
const SHARED_VARIABLES = require('./src/SHARED_VARIABLES.js');
const { disBotServers } = require('./src/SHARED_VARIABLES.js');

//---------------------------------------------------------------------------------------------------------------//

//#region utility functions
const { getReadableTime } = require('./utilities.js');
//#endregion utility functions

//#region bot files
const bot_command_log_file = process.env.BOT_COMMAND_LOG_FILE;
const bot_blacklisted_guilds_file = process.env.BOT_BLACKLISTED_GUILDS_FILE;
const bot_blacklisted_users_file = process.env.BOT_BLACKLISTED_USERS_FILE;
//#endregion bot files

//#region bot globals
const bot_common_name = bot_config.common_name;
const bot_version = bot_config.public_version;
const bot_website = bot_config.website;
const bot_default_guild_config = bot_config.default_guild_config;
const bot_support_guild_invite_url = bot_config.support_guild_invite_url;
const bot_logging_guild_id = process.env.BOT_LOGGING_GUILD_ID;
const bot_appeals_guild_id = process.env.BOT_APPEALS_GUILD_ID;
const bot_cdn_url = process.env.BOT_CDN_URL;
//#endregion bot globals

//#region bot channels
const bot_special_channels = bot_config.special_channels;

const bot_backup_commands_channel_name = bot_special_channels.BOT_COMMANDS.public_name;

const bot_restart_log_channel_name = bot_special_channels.BOT_RESTARTS.public_name;
const bot_command_log_channel_name = bot_special_channels.GUILD_COMMANDS.public_name;
const bot_update_log_channel_name = bot_special_channels.BOT_UPDATES.public_name;
const bot_members_log_channel_name = bot_special_channels.GUILD_MEMBERS.public_name;
const bot_invite_log_channel_name = bot_special_channels.GUILD_INVITES.public_name;
const bot_moderation_log_channel_name = bot_special_channels.GUILD_MODERATION.public_name;
const bot_reaction_log_channel_name = bot_special_channels.GUILD_REACTIONS.public_name;
const bot_appeals_log_channel_name = bot_special_channels.GUILD_APPEALS.public_name;

const bot_special_text_channels = [
    bot_restart_log_channel_name,
    bot_update_log_channel_name,
    bot_command_log_channel_name,
    bot_moderation_log_channel_name,
    bot_invite_log_channel_name,
    bot_appeals_log_channel_name,
    bot_members_log_channel_name,
    bot_reaction_log_channel_name
];

const bot_central_guild_history_channel_id = process.env.BOT_LOGGING_CHANNEL_GUILD_HISTORY_ID;
const bot_central_anonymous_command_log_channel_id = process.env.BOT_LOGGING_CHANNEL_ANONYMOUS_COMMAND_LOG_ID;
//#endregion bot channels

//#region bot controllers
const { isThisBot, isThisBotsOwner, isSuperPerson, isSuperPersonAllowed } = require('./src/permissions.js');
//#endregion bot controllers

//---------------------------------------------------------------------------------------------------------------//

const { CustomRichEmbed } = require('./src/CustomRichEmbed.js');

//---------------------------------------------------------------------------------------------------------------//

const { logUserError } = require('./src/errors.js');

//---------------------------------------------------------------------------------------------------------------//

const { logAdminCommandsToGuild } = require('./src/messages.js');

//---------------------------------------------------------------------------------------------------------------//

const { GuildConfigManipulator } = require('./src/GuildConfig.js');

//---------------------------------------------------------------------------------------------------------------//

const { QueueManager } = require('./src/QueueManager.js');

//---------------------------------------------------------------------------------------------------------------//

const { AudioController } = require('./src/AudioController.js');

//---------------------------------------------------------------------------------------------------------------//

const { VolumeManager } = require('./src/VolumeManager.js');

//---------------------------------------------------------------------------------------------------------------//

const { getDiscordCommand, getDiscordCommandArgs, DisBotCommand, DisBotCommander } = require('./src/DisBotCommander.js');

//---------------------------------------------------------------------------------------------------------------//

async function updateGuildConfig(guild) {
    if (!guild) {
        console.error('MAJOR ISSUE: Guild is not defined!');
        return;
    }
    if (!guild.available) {
        console.error(`Guild: ${guild.id} was not available!`);
        return;
    }
    if (guild.partial) await guild.fetch();

    const guild_config_manipulator = new GuildConfigManipulator(guild.id);
    const old_guild_config = guild_config_manipulator.config;

    /* the methodology used below can clone a property in all guild configs */
    // old_guild_config['NEW_PROPERTY_NAME'] = old_guild_config['OLD_PROPERTY_NAME'];

    /* the methodology used below can remove a property from all guild configs */
    // delete old_guild_config['PROPERTY_NAME'];

    const new_guild_config = {
        ...{// Only write this info upon first addition to the config
            '_added_on':`${moment()}`
        },
        ...bot_default_guild_config,
        ...old_guild_config,
        ...{// Update the following information
            '_last_seen_on':`${moment()}`,
            '_exists':guild.available,
            '_name':guild.name,
            '_region':guild.region,
            '_features':`${guild.features}`,
            '_owner':`@${guild.owner?.user?.tag} (${guild.owner?.id})`,
            '_has_permissions':`${guild.me.hasPermission('ADMINISTRATOR') ? 'ADMINISTRATOR' : guild.me.permissions.toArray()}`,
            '_member_count':guild.members.cache.filter(member => !member.user.bot).size,
            '_bot_count':guild.members.cache.filter(member => member.user.bot).size
        }
    };
    guild_config_manipulator.modifyConfig(new_guild_config);
}

function add_guild_to_disBotServers(guild) {
    if (!guild) {
        console.error('MAJOR ISSUE: Guild is not defined!');
        return;
    }
    disBotServers[guild.id] = {
        ...(disBotServers[guild.id] ?? {}),
        ...{
            queue_manager:new QueueManager(),
            volume_manager:new VolumeManager(guild),
            audio_controller:new AudioController(guild),
            dispatcher:undefined
        }
    };
}

//---------------------------------------------------------------------------------------------------------------//

function checkForBlacklistedGuild(guild) {
    const blacklisted_guilds = JSON.parse(fs.readFileSync(bot_blacklisted_guilds_file));
    const guild_is_blacklisted = blacklisted_guilds.map(blacklisted_guild => blacklisted_guild.id).includes(guild?.id);
    return guild_is_blacklisted ? true : false;
}

function checkForBlacklistedUser(message) {
    const blacklisted_users = JSON.parse(fs.readFileSync(bot_blacklisted_users_file));
    if (blacklisted_users.map(blacklisted_user => blacklisted_user.id).includes(message.author.id)) {// Prevent certain users from using the bot
        console.log(`Blacklisted user tried using ${bot_common_name}: ${message.author.tag} (${message.author.id})`);
        const embed = new CustomRichEmbed({
            color:0xFF00FF,
            title:`Sorry but you were blacklisted from using ${bot_common_name}!`,
            description:`You can try appealing in the [${bot_common_name} Discord Server](${bot_support_guild_invite_url})`
        });
        message.author.createDM().then(dmChannel => {
            dmChannel.send(embed);
        }).catch(() => { // Unable to send to blacklisted user
            message.channel.send(embed); // Send to guild instead
        });
        return true;
    }
}

//---------------------------------------------------------------------------------------------------------------//

// client.on('debug', console.info);

client.on('warn', console.trace);

client.on('error', console.trace);

client.on('ready', async () => {
    const ready_timestamp = moment();

    console.log(`----------------------------------------------------------------------------------------------------------------`);
    console.log(`${bot_common_name} Logged in as ${client.user.tag} on ${ready_timestamp} in ${client.guilds.cache.size} servers!`);
    console.log(`----------------------------------------------------------------------------------------------------------------`);

    /* log to all subscribed servers that a restart has just happened */
    const guild_restart_logging_channels = client.channels.cache.filter(channel => channel.type === 'text' && channel.name === bot_restart_log_channel_name);
    guild_restart_logging_channels.forEach(channel => {
        if (channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
            channel.send(`${bot_common_name} restarted! ${ready_timestamp}`);
        } else {
            console.warn(`Unable to send restart message to ${channel.name} (${channel.id}) > ${channel.guild.name} (${channel.guild.id})`)
        }
    });

    /* set the client presence to indicate a restart has just happened */
    client.user.setPresence({type:4, activity:{name:`Just restarted!`}});

    /* update the client presence with various helpful information */
    let presenceMode = 'mention'; // can be [ mention | uptime | creator | mention_me | version | guilds | users ]
    client.setTimeout(() => { // wait after a restart before updating the presence
        client.setInterval(() => {
            switch (presenceMode) {
                case 'mention':
                    client.user.setPresence({type:4, activity:{name:`@${client.user.tag}`}});
                    presenceMode = 'uptime';
                break;
                case 'uptime':
                    client.user.setPresence({type:4, activity:{name:`Uptime: ${getReadableTime(client.uptime / 1000)}`}});
                    presenceMode = 'creator';
                break;
                case 'creator':
                    client.user.setPresence({type:4, activity:{name:`👨‍💻${client.users.cache.get(bot_config.owner_id).tag}👑`}});
                    presenceMode = 'mention_me';
                break;
                case 'mention_me':
                    client.user.setPresence({type:4, activity:{name:`@mention me for help!`}});
                    presenceMode = 'version';
                break;
                case 'version':
                    client.user.setPresence({type:4, activity:{name:`${bot_version}`}});
                    presenceMode = 'guilds';
                break;
                case 'guilds':
                    client.user.setPresence({type:4, activity:{name:`in ${client.guilds.cache.size} servers!`}});
                    presenceMode = 'users';
                break;
                case 'users':
                    client.user.setPresence({type:4, activity:{name:`with ${client.users.cache.filter(user => !user.bot).size} people!`}});
                    presenceMode = 'mention';
                break;
            }
        }, 1000 * 10); // 10 seconds
    }, 1000 * 60 * 1); // 1 minute

    /* update guild configs to include their state of existence */
    const main_guild_config_manipulator = new GuildConfigManipulator(bot_logging_guild_id);
    const resolved_guilds_from_configs = Object.keys(main_guild_config_manipulator.configs).map(guild_config_id => ({id:`${guild_config_id}`, exists:!!client.guilds.resolve(guild_config_id)}));
    resolved_guilds_from_configs.forEach(resolved_guild => {
        const guild_config_manipulator = new GuildConfigManipulator(resolved_guild.id);
        const resolved_guild_exists = !!resolved_guild.exists;
        guild_config_manipulator.modifyConfig({
            ...{
                '_exists':resolved_guild_exists
            }
        });
    });

    /* update all guild configs and register the guild to disBotServers */
    client.guilds.cache.forEach(async guild => {
        updateGuildConfig(guild);
        add_guild_to_disBotServers(guild);
    });

    /* update all guild configs with an interval of 5 minutes */
    client.setInterval(() => {
        client.guilds.cache.forEach(guild => updateGuildConfig(guild));
    }, 1000 * 60 * 5);
});

client.on('invalidated', () => {
    console.warn(`----------------------------------------------------------------------------------------------------------------`);
    console.warn(`Bot session was invalidated!`);
    console.warn(`----------------------------------------------------------------------------------------------------------------`);
    process.exit(1);
});

// client.on('rateLimit', (rateLimit) => {
//     console.log(`----------------------------------------------------------------------------------------------------------------`);
//     console.log('RateLimit:', rateLimit);
//     console.log(`----------------------------------------------------------------------------------------------------------------`);
// });

//---------------------------------------------------------------------------------------------------------------//

client.on('voiceStateUpdate', async (old_voice_state, new_voice_state) => {
    if (old_voice_state.member.id === client.user.id && new_voice_state.member.id === client.user.id) {
        if (new_voice_state.connection && new_voice_state.channel) {// Run if connected to a voice channel
            client.setTimeout(() => {
                if (new_voice_state.serverMute) new_voice_state.setMute(false, `Don't mute me!`);
                if (new_voice_state.serverDeaf) new_voice_state.setDeaf(false, `Don't deafen me!`);
            }, 500);
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

// client.on('guildUnavailable', (guild) => {
//     console.info(`----------------------------------------------------------------------------------------------------------------`);
//     console.info(`Guild: (${guild?.id}) is unavailable!`);
//     console.info(`----------------------------------------------------------------------------------------------------------------`);
// });

client.on('guildUpdate', async (old_guild, new_guild) => {
    if (new_guild.partial) await new_guild.fetch().catch(console.warn);
    updateGuildConfig(new_guild);
});

client.on('guildCreate', async guild => {
    if (guild.partial) guild.fetch().catch(console.warn);
    if (!guild.available) return;

    const central_guild_history_logging_channel = client.channels.cache.get(bot_central_guild_history_channel_id);
    central_guild_history_logging_channel?.send(new CustomRichEmbed({
        color:0x00FF00,
        author:{iconURL:guild.iconURL(), name:`${guild.name} (${guild.id})`},
        title:`Added ${bot_common_name}!`,
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${moment()}`}
    }));

    const viewable_text_channels = guild.channels.cache.filter(c => c.type === 'text' && c.viewable && c.permissionsFor(guild.me).has('SEND_MESSAGES'));
    const potential_bot_commands_channel = viewable_text_channels.filter(c => ['bot-commands', 'commands', 'bot'].includes(c.name)).first();
    const potential_general_channel = viewable_text_channels.filter(c => ['general-chat', 'general', 'chat'].includes(c.name)).first();
    const fallback_first_available_channel = viewable_text_channels.first();
    const channel_to_send_initial_message = potential_bot_commands_channel ?? potential_general_channel ?? fallback_first_available_channel;
    const new_guild_information_embed = new CustomRichEmbed({
        title:`Hello there ${guild.name}!`,
        description:[
            `**Thank you for addding me!**`,
            `My command prefix is \`${bot_default_guild_config.command_prefix}\` by default!`,
            `You can use \`${bot_default_guild_config.command_prefix}help\` to see a list of commands that you can use.`,
            `You can **directly message** me to get in touch with my [Support Staff](${bot_support_guild_invite_url})!`,
            `I function most optimally with the **ADMINISTRATOR** permission given to me, **however ADMINISTRATOR is not required for me to work!**`,
            `There are *special channels* that I can provide to you, use \`${bot_default_guild_config.command_prefix}create_special_channels\` to have me make them for you!`,
            `There might be [additional information on the website](${bot_website}) that may be useful to you!`
        ].join(`\n\n`),
        image:`${bot_cdn_url}/new_guild_information_2020-06-27_1.png`
    });

    try {
        channel_to_send_initial_message.send(new_guild_information_embed);
    } catch {
        console.warn(`Failed to send new guild information for ${guild.name} (${guild.id}) to the guild!`);
        try {
            const guild_owner_dms = await guild.owner.createDM();
            await guild_owner_dms.send([
                `Hi there ${guild.owner.user.username}!`,
                `I was unable to send the following message in your server: **${guild.name}**.`
            ].join('\n'));
            guild_owner_dms.send(new_guild_information_embed);
        } catch {
            console.warn(`Failed to send new guild information for ${guild.name} (${guild.id}) to the owner!`);
        }
    }
    
    updateGuildConfig(guild);
    add_guild_to_disBotServers(guild);
});

client.on('guildDelete', async guild => {
    if (guild.partial) guild.fetch().catch(console.warn);
    client.channels.cache.get(bot_central_guild_history_channel_id).send(new CustomRichEmbed({
        color:0xFFFF00,
        author:{iconURL:guild.iconURL(), name:`${guild?.name} (${guild?.id})`},
        title:`Removed ${bot_common_name}!`,
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${moment()}`}
    }));
});

//---------------------------------------------------------------------------------------------------------------//

client.on('channelCreate', async channel => {
    if (channel) channel.fetch().catch(console.warn);

    if (channel.type !== 'text') return;
    const guild_config_manipulator = new GuildConfigManipulator(channel.guild.id);
    const guild_config = guild_config_manipulator.config;
    const command_prefix = guild_config.command_prefix;
    function prevent_sending_messages_in_channel(channel) {
        channel.overwritePermissions([
            {id:channel.guild.roles.everyone.id, deny:['SEND_MESSAGES']},
            {id:channel.guild.me.id, allow:['SEND_MESSAGES']}, // Trust me on this... Somehow this is needed!
        ], `Don't allow people to send messages in a logging channel!`);
    }
    switch (channel.name) {
        case bot_backup_commands_channel_name:
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:`Any ${bot_common_name} commands can be used here by people with appropriate permissions!`
            }));
        break;
        case bot_appeals_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:`Now syncing future \`${command_prefix}ban\` command appeal messages to this channel!`
            }));
            channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Warning!',
                description:`This feature is in BETA!`
            }));
        break;
        case bot_restart_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future bot restart history to channel!'
            }));
        break;
        case bot_update_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future bot update history to channel!'
            }));
        break;
        case bot_command_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future guild command history to channel!'
            }));
        break;
        case bot_moderation_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future guild moderation history to channel!'
            }));
        break;
        case bot_invite_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future guild invite history to channel!'
            }));
            channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Warning!',
                description:`If I don't have the \`MANAGE_GUILD\` and \`VIEW_AUDIT_LOG\` permissions, I will need them to see invite events for all channels!`
            }));
        break;
        case bot_members_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future guild member join/leave history to channel!'
            }));
        break;
        case bot_reaction_log_channel_name:
            prevent_sending_messages_in_channel(channel);
            channel.send(new CustomRichEmbed({
                title:'Channel Linked',
                description:'Now syncing future guild message reaction history to channel!'
            }));
            channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Warning!',
                description:`Any reactions added by bots will not be logged for performance reasons!`
            }));
        break;
    }
});

//---------------------------------------------------------------------------------------------------------------//

client.on('guildMemberAdd', async member => {
    if (member.partial) member.fetch().catch(console.warn);

    if (isThisBot(member.id)) return; // Don't log the bot itself joining... It can happen oddly enough...
    const logging_channel = member.guild.channels.cache.find(channel => channel.name === bot_members_log_channel_name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color:0x00FF00,
        author:{iconURL:member.user.displayAvatarURL({dynamic:true}), name:`@${member.user.tag} (${member.user.id})`},
        title:'Joined the server!',
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${moment()}`}
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

client.on('guildMemberRemove', async member => {
    if (member.partial) member.fetch().catch(console.warn);

    if (isThisBot(member.id)) return; // Don't log the bot itself leaving... It can happen oddly enough...
    const logging_channel = member.guild.channels.cache.find(channel => channel.name === bot_members_log_channel_name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color:0xFFFF00,
        author:{iconURL:member.user.displayAvatarURL({dynamic:true}), name:`@${member.user.tag} (${member.user.id})`},
        title:'Left the server!',
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${moment()}`}
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

//---------------------------------------------------------------------------------------------------------------//

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) await reaction.fetch().catch(console.warn);
    if (reaction.message.partial) await reaction.message.fetch().catch(console.warn);
    if (user.partial) await user.fetch().catch(console.warn);

    if (user.bot) return; // Don't log bots
    if (!reaction.message.guild) return; // Don't continue with DM reactions

    const member = reaction.message.guild.members.cache.get(user.id);
    const logging_channel = reaction.message.guild.channels.cache.find(channel => channel.name === bot_reaction_log_channel_name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color:0x00FF00,
        author:{iconURL:member.user.displayAvatarURL({dynamic:true}), name:`@${member.user.tag} (${member.user.id})`},
        title:'Added A Message Reaction',
        description:[
            `Message: [Message Link](${reaction.message.url})`,
            `Reaction Id: \`${reaction.emoji.id}\``,
            `Reaction Markup: \`${reaction.emoji}\``,
            `Reaction Emoji: ${reaction.emoji}`,
        ].join('\n'),
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${moment()}`}
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (reaction.partial) await reaction.fetch().catch(console.warn);
    if (reaction.message.partial) await reaction.message.fetch().catch(console.warn);
    if (user.partial) await user.fetch().catch(console.warn);

    if (user.bot) return; // Don't log bots
    if (!reaction.message.guild) return; // Don't continue with DM reactions

    const member = reaction.message.guild.members.cache.get(user.id);
    const logging_channel = reaction.message.guild.channels.cache.find(channel => channel.name === bot_reaction_log_channel_name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        color:0xFFFF00,
        author:{iconURL:member.user.displayAvatarURL({dynamic:true}), name:`@${member.user.tag} (${member.user.id})`},
        title:'Removed A Message Reaction',
        description:[
            `Message: [Message Link](${reaction.message.url})`,
            `Reaction Id: \`${reaction.emoji.id}\``,
            `Reaction Markup: \`${reaction.emoji}\``,
            `Reaction Emoji: ${reaction.emoji}`,
        ].join('\n'),
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${moment()}`}
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

//---------------------------------------------------------------------------------------------------------------//

client.on('inviteCreate', async invite => {
    if (!invite.channel?.guild) return;
    const logging_channel = invite.channel.guild.channels.cache.find(channel => channel.name === bot_invite_log_channel_name);
    if (!logging_channel) return;
    logging_channel.send(new CustomRichEmbed({
        title:'An Invite Has Been Created!',
        fields:[
            {name:'Created By', value:`${invite.inviter}`},
            {name:'Invite Code', value:`\`${invite.code}\``},
            {name:'Invite URL', value:`<${invite.url}>`}
        ]
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

client.on('inviteDelete', async invite => {
    if (!invite.channel?.guild) return;
    const logging_channel = invite.channel.guild.channels.cache.find(channel => channel.name === bot_invite_log_channel_name);
    if (!logging_channel) return;
    const last_audit_log_deleted_invite_entry = (await invite.channel.guild.fetchAuditLogs({limit:1, type:'INVITE_DELETE'})).entries.first();
    const person_to_blame = last_audit_log_deleted_invite_entry?.executor ?? 'N/A';
    logging_channel.send(new CustomRichEmbed({
        title:'An Invite Has Been Deleted!',
        fields:[
            {name:'Deleted By', value:`${person_to_blame}`},
            {name:'Invite Code', value:`\`${invite.code}\``},
            {name:'Invite URL', value:`<${invite.url}>`}
        ]
    })).catch(() => {
        console.warn(`Unable to send message to ${logging_channel.guild.name} (${logging_channel.guild.id}) > ${logging_channel.name} (${logging_channel.id})`);
    });
});

//---------------------------------------------------------------------------------------------------------------//

//#region bot appeals centre
client.on('guildMemberAdd', async member => {
    if (member.partial) await member.fetch().catch(console.warn);

    if (member.guild.id !== bot_appeals_guild_id) return; // Check to see if the joined the Bot Appeals Guild

    for (let guild of client.guilds.cache.values()) {
        await Timer(250); // Prevent Discord API Abuse
        if (!guild.me.hasPermission(['KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_GUILD', 'VIEW_AUDIT_LOG'])) continue; // DO NOT USE RETURN
        const guild_bans = await guild.fetchBans();
        const is_banned_in_guild = guild_bans.has(member.id);
        if (is_banned_in_guild) { // The GuildMember is not banned in this server with the bot
            const guild_with_banned_member = guild;
            const banned_guild_member = member;
            const bot_appeals_guild = client.guilds.cache.get(bot_appeals_guild_id);
            const potential_purgatory_channel = bot_appeals_guild.channels.cache.find(channel => channel.name === `${guild_with_banned_member.id}-${banned_guild_member.id}`);
            const bot_purgatory_channel = potential_purgatory_channel ?? await bot_appeals_guild.channels.create(`${guild_with_banned_member.id}-${banned_guild_member.id}`, {
                type:'text',
                topic:`Welcome to purgatory @${banned_guild_member.user.tag} for the server ${guild_with_banned_member.name}`,
                parent:process.env.APPEALS_GUILD_PURGATORY_CHANNELS_CATEGORY_ID,
                permissionOverwrites:[
                    {id:bot_appeals_guild.roles.everyone.id, deny:['VIEW_CHANNEL']},
                    {id:banned_guild_member.id, allow:['VIEW_CHANNEL']}
                ]
            });
            await bot_purgatory_channel.send(`<@${banned_guild_member.id}>`);
            await bot_purgatory_channel.send(new CustomRichEmbed({
                title:`You did something to piss off ${guild_with_banned_member.name}!`,
                description:[
                    `As such, you have been sent here by ${bot_common_name}.`,
                    `If you haven't looked at <#${process.env.APPEALS_GUILD_ABOUT_CHANNEL_ID}> yet, then go look at it!`,
                    `You may send **ONE** message here, to *possibly* be viewed by the staff from the server you were banned in.`
                ].join('\n')
            }));
            const collection_filter = (message) => message.author.id === banned_guild_member.id;
            const message_collector = bot_purgatory_channel.createMessageCollector(collection_filter, {max:1, maxProcessed:1});
            message_collector.on('collect', async collected_message => {
                await bot_purgatory_channel.send(new CustomRichEmbed({
                    author:{iconURL:collected_message.member.user.displayAvatarURL({dynamic:true}), name:`@${collected_message.member.user.tag} (${collected_message.member.user.id})`},
                    title:'Your apology message has been sent!',
                    description:[
                        `This **does not** mean that the server you apologized to, has seen it or will ever see it.`,
                        `They must specifically **opt-in** to receiving such messages.`,
                        `Since you sent your apology, you will not be able to type in this channel anymore.`
                    ].join('\n')
                }));
                await bot_purgatory_channel.overwritePermissions([
                    {id:bot_appeals_guild.roles.everyone.id, deny:['VIEW_CHANNEL']},
                    {id:banned_guild_member.id, allow:['VIEW_CHANNEL'], deny:['SEND_MESSAGES']}
                ]);
                guild.channels.cache.filter(channel => channel.type === 'text' && channel.name === bot_appeals_log_channel_name).forEach(async guild_purgatory_channel => {
                    await guild_purgatory_channel.send(new CustomRichEmbed({
                        author:{iconURL:collected_message.member.user.displayAvatarURL({dynamic:true}), name:`@${collected_message.member.user.tag} (${collected_message.member.user.id})`},
                        title:'Sent you an apology for being banned',
                        description:`${collected_message.cleanContent}`
                    }));
                });
            });
        }
    }
});
//#endregion bot appeals centre

//---------------------------------------------------------------------------------------------------------------//

//#region automatic roles additions
client.on('guildMemberAdd', async member => {
    if (member.partial) await member.fetch().catch(console.warn);

    const guild = member.guild;
    const auto_roles = new GuildConfigManipulator(guild.id).config.new_member_roles ?? [];
    if (auto_roles.length > 0 && guild.me.hasPermission('MANAGE_ROLES')) {
        await Timer(1000); // Prevent API Abuse
        member.roles.add(auto_roles, 'Adding Auto Roles');
    }
});
//#endregion automatic roles additions

//---------------------------------------------------------------------------------------------------------------//

//#region direct messages with bot support server
client.on('message', async message => {
    if (message.partial) await message.fetch().catch(console.warn);
    if (message.user?.partial) await message.user.fetch().catch(console.warn);
    if (message.member?.partial) await message.member.fetch().catch(console.warn);
    if (message.guild) await message.guild.fetch().catch(console.warn);
    
    if (message.author.bot) return; // Don't interact with bots

    if (SHARED_VARIABLES.lockdown_mode && !isThisBotsOwner(message.author.id)) return; // Don't continue when the bot is in lockdown mode

    if (message.channel.type === 'text' && message.channel.parentID === process.env.CENTRAL_DM_CHANNELS_CATEGORY_ID) {
        const user_to_dm_from_dm_channel = client.users.cache.get(`${message.channel.name.replace('dm-', '')}`);
        if (!user_to_dm_from_dm_channel) return;
        const dm_embed = new CustomRichEmbed({
            author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
            description:`${message.cleanContent}`,
            fields:(message.attachments.size > 0 ? message.attachments.map(attachment => ({
                name:`Message Attachment:`,
                value:`[${attachment.name}](${attachment.url}) (${attachment.id}) ${attachment.size} bytes`
            })) : null),
            footer:{
                iconURL:`${client.user.displayAvatarURL({dynamic:true})}`,
                text:`Support Staff: ${moment()}`
            }
        });
        await message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
        try {
            const dm_channel = await user_to_dm_from_dm_channel.createDM();
            await dm_channel.send(dm_embed);
            await message.channel.send(dm_embed);
        } catch {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Unable to send messages to this user!'
            }));
        }
    }
    if (message.channel.type === 'dm') {
        const dmEmbed = new CustomRichEmbed({
            color:0xBBBBBB,
            author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
            description:`${message.cleanContent}`,
            fields:[
                {name:`Link`, value:`[Direct Message Link](${message.url.replace('@me', client.user.id)})`},
                ...(message.attachments.size > 0 ? message.attachments.map(attachment => ({
                    name:`Message Attachment:`,
                    value:`[${attachment.name}](${attachment.url}) (${attachment.id}) ${attachment.size} bytes`
                })) : [])
            ],
            footer:{
                iconURL:`${client.user.displayAvatarURL({dynamic:true})}`,
                text:`[Direct Message]: ${moment()}`
            }
        });
        const bot_logging_guild = client.guilds.cache.get(bot_logging_guild_id);
        const potential_central_dm_channel_with_user = bot_logging_guild.channels.cache.find(channel => channel.name === `dm-${message.author.id}`);
        if (potential_central_dm_channel_with_user) {
            potential_central_dm_channel_with_user.send(dmEmbed);
        } else {
            await message.channel.send(new CustomRichEmbed({
                title:`Opening Chat With ${bot_common_name} Staff`,
                description:`My staff will answer any questions as soon as they see it!\n\nRemember that you can request for your history to be deleted at any time!`
            }));
            const central_dm_channel_with_user = await bot_logging_guild.channels.create(`dm-${message.author.id}`, {
                type:'text',
                topic:`${message.author.tag} (${message.author.id}) | ${moment()}`
            }).catch(console.trace);
            await central_dm_channel_with_user.setParent(process.env.CENTRAL_DM_CHANNELS_CATEGORY_ID).catch(console.trace);
            await Timer(500); // For some reason Discord.js needs a little bit to recognise the new parent of the channel, therefore this delay exists
            await central_dm_channel_with_user.lockPermissions().catch(console.trace);
            await central_dm_channel_with_user.send(new CustomRichEmbed({
                title:`Opened DM with: ${message.author.tag} (${message.author.id})`
            }));
            await central_dm_channel_with_user.send(dmEmbed);
        }
    }
});
//#endregion direct messages with bot support server

//---------------------------------------------------------------------------------------------------------------//

client.on('message', async message => {
    /* handle potential partial data structures */
    if (message.partial) await message.fetch().catch(console.warn);
    if (message.user?.partial) await message.user.fetch().catch(console.warn);
    if (message.member?.partial) await message.member.fetch().catch(console.warn);
    if (message.guild) await message.guild.fetch().catch(console.warn);

    /* don't continue if the message is empty and there aren't any attachments */
    if (message.content.trim().length === 0 && message.attachments.size === 0) return;

    /* don't interact with other bots */
    if (message.author.bot) return;

    /* don't continue when the bot is in lockdown mode */
    if (SHARED_VARIABLES.lockdown_mode && !isThisBotsOwner(message.author.id)) return;

    /* make sure that the message is from a guild text-channel */
    if (message.channel.type !== 'text') return;

    /********************************************************************
     * the bot is being used in a guild text-channel after this comment *
     ********************************************************************/

    /* don't continue when the guild is in lockdown mode */
    if (disBotServers[message.guild.id]?.lockdown_mode && !isThisBotsOwner(message.author.id)) return;

    /* register the guild config manipulator and guild config */
    const guild_config_manipulator = new GuildConfigManipulator(message.guild.id);
    const guild_config = guild_config_manipulator.config;

    /* register the guild command prefix */
    const command_prefix = guild_config.command_prefix ?? bot_default_guild_config.command_prefix;

    /* confirm that the guild command prefix is valid prefix */
    if (typeof command_prefix !== 'string' || command_prefix.length === 0) {
        console.error(`Guild (${message.guild.id}) has an invalid command prefix: ${command_prefix}; manual fixing is required!`);
        return;
    }

    /* don't allow blacklisted users and notify them of their inability to use this bot */
    if (checkForBlacklistedUser(message)) return;

    /* don't allow blacklisted guilds and silently halt execution */
    if (checkForBlacklistedGuild(message.guild)) return;

    /* don't allow users in guild timeout and notify them of their inability to use this bot */
    const guild_users_in_timeout = guild_config.users_in_timeout ?? [];
    if (guild_users_in_timeout.includes(message.author.id)) {
        try {
            await message.delete({timeout:500});
            const dm_channel = await message.author.createDM();
            await dm_channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:`I'm sorry, you were put into an indefinite timeout in ${message.guild.name}.`,
                description:[
                    `Currently all messages that you are trying to send in that server will be deleted!`,
                    `Please contact an administrator on that discord server to be removed from timeout.`
                ].join('\n')
            }));
        } catch {
            // ignore any errors... they wont matter here
        }
        return;
    }

    //#region handle guild invite-blocking
    const guild_invite_blocking_enabled = guild_config.invite_blocking === 'enabled';
    const contains_invite_link = message.cleanContent.includes(`discord.gg/`) || message.cleanContent.includes('discord.com/invite/') || message.cleanContent.includes(`discord.io/`) || message.cleanContent.includes(`invite.gg/`);
    if (guild_invite_blocking_enabled && contains_invite_link) {
        if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            const _member_is_immune = message.member.hasPermission('ADMINISTRATOR');
            message.channel.send(new CustomRichEmbed({
                color:(_member_is_immune ? 0x00FF00 : 0xFFFF00),
                author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                title:'Woah there!',
                description:`Sending discord invites is not allowed in this guild${_member_is_immune ? ', but you are immune!' : '!'}`
            }));
            if (!_member_is_immune) {
                await message.delete({timeout:250}).catch(error => console.warn(`Unable to delete message`, error));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFF0000,
                title:'An error has occurred!',
                description:`This guild has invite blocking enabled, but I do not have the permission \`MANAGE_MESSAGES\` to delete messages containing discord invites.`
            }));
        }
    }
    //#endregion handle guild invite-blocking

    //#region handle guild url-blocking
    const guild_url_blocking_enabled = guild_config.url_blocking === 'enabled';
    const contains_url = new RegExp('([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?').test(message.cleanContent);
    if (guild_url_blocking_enabled && contains_url) {
        if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            const _member_is_immune = message.member.hasPermission('ADMINISTRATOR');
            message.channel.send(new CustomRichEmbed({
                color:(_member_is_immune ? 0x00FF00 : 0xFFFF00),
                author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                title:'Woah there!',
                description:`Sending links is not allowed in this guild${_member_is_immune ? ', but you are immune!' : '!'}`
            }));
            if (!_member_is_immune) {
                await message.delete({timeout:250}).catch(error => console.warn(`Unable to delete message`, error));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFF0000,
                title:'An error has occurred!',
                description:`This guild has url blocking enabled, but I do not have the permission \`MANAGE_MESSAGES\` to delete messages containing urls.`
            }));
        }
    }
    //#endregion handle guild url-blocking

    //#region handle messages that start with a @mention of this bot
    if (message.content.startsWith(`<@!${client.user.id}>`)) {
        const quick_help_embed = new CustomRichEmbed({
            title:`Hi there ${message.author.username}!`,
            description:[
                `My command prefix is \`${command_prefix}\` in **${message.guild.name}**.`,
                `Use \`${command_prefix}help\` in that server to get started!`
            ].join('\n')
        });
        try {
            await message.channel.send(quick_help_embed);
        } catch {
            const dm_channel = await message.author.createDM();
            dm_channel.send(quick_help_embed).catch(console.warn);
        }
        return;
    }
    //#endregion handle messages that start with a @mention of this bot

    /* check if the message starts with the command prefix */
    if (!message.content.startsWith(command_prefix)) return;

    /**********************************************
     * start handling commands after this comment *
     **********************************************/

    /* setup command constants */
    const command_timestamp = moment();
    const discord_command = getDiscordCommand(message.content);
    const command_args =  getDiscordCommandArgs(message.content);
    const clean_command_args = getDiscordCommandArgs(message.cleanContent);
    const discord_command_without_prefix = discord_command.replace(`${command_prefix}`, ``);

    /* prevent false positives for non-command matches */
    if (discord_command_without_prefix.match(/^\d/)) return; // commands can't start with numbers

    //#region check for guild allowed channels
    const guild_allowed_channels = guild_config.allowed_channels;
    const fetched_allowed_channels = await Promise.all(guild_allowed_channels.map(async channel_id => await message.guild.channels.resolve(channel_id)?.fetch()));
    const is_not_backup_commands_channel = message.channel.name !== bot_backup_commands_channel_name;
    const is_guild_allowed_channel = guild_allowed_channels.includes(message.channel.id);
    const member_is_immune_from_channel_exclusions = message.member.hasPermission('ADMINISTRATOR');
    if (guild_allowed_channels.length > 0 && is_not_backup_commands_channel && !is_guild_allowed_channel && !member_is_immune_from_channel_exclusions) {
        const dm_channel = await message.author.createDM();
        dm_channel.send(new CustomRichEmbed({
            title:`Sorry you aren't allowed to use ${bot_common_name} commands in that channel.`,
            description:`The server you tried using me in has setup special channels for me to be used in!`,
            fields:[
                {
                    name:'Allowed Channels',
                    value:`${'```'}\n${fetched_allowed_channels.map(channel => `#${channel.name} (${channel.id})`).join('\n')}\n${'```'}`
                }, {
                    name:'Notice',
                    value:`Anyone can use ${bot_common_name} commands in text-channels called \`#${bot_backup_commands_channel_name}\`.`
                }, {
                    name:'Notice',
                    value:`Members with the \`ADMINISTRATOR\` permission can use ${bot_common_name} commands in any text-channel.`
                }
            ]
        }));
        return;
    }
    //#endregion check for guild allowed channels

    //#region check for valid command
    const command = DisBotCommander.commands.find(cmd => cmd.aliases.map(cmd => `${command_prefix}${cmd.replace('#{cp}', `${command_prefix}`)}`).includes(discord_command));
    if (!command) {
        message.channel.send(new CustomRichEmbed({
            title:`That command doesn't exist!`,
            description:`Try \`${command_prefix}help\` for a list of commands!\n\nIf \`${command_prefix}\` is being used by another bot, use the command below to change ${bot_common_name} command prefix!`,
            fields:[
                {name:`How to change ${bot_common_name} command prefix`, value:`\`\`\`${command_prefix}set_prefix NEW_PREFIX_HERE\`\`\``}
            ]
        }, message));
        return;
    }
    //#region check for valid command

    //#region block commands when restarting
    if (SHARED_VARIABLES.restarting_bot) {
        message.channel.send(new CustomRichEmbed({
            color:0xFF00FF,
            title:`You currently can't use ${bot_common_name}!`,
            description:`${bot_common_name} is restarting for updates right now!\nCheck back in 5 minutes to see if the updates are done.`
        }, message));
        return;
    }
    //#endregion block commands when restarting

    //#region command message removal
    if (message.deletable && message.attachments.size === 0 && guild_config.command_message_removal === 'enabled') {
        try {
            message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
        } catch (error) {
            console.warn(error);
        }
    }
    //#endregion command message removal

    //#region central command logging
    try {
        const current_command_log_file_name = bot_command_log_file.replace('#{date}', `${moment().format(`YYYY_MM`)}`);
        const command_log_file_exists = fs.existsSync(current_command_log_file_name);
        const current_command_logs = command_log_file_exists ? JSON.parse(fs.readFileSync(current_command_log_file_name)) : [];
        const command_log_entry = {
            guild:`[${message.guild.name}] (${message.guild.id})`,
            user:`[@${message.author.tag}] (${message.author.id})`,
            channel:`[#${message.channel.name}] (${message.channel.id})`,
            timestamp:`${command_timestamp}`,
            command:`${message.content}`
        };
        console.info({command_log_entry});
        const updated_command_log = [...current_command_logs, command_log_entry];
        fs.writeFileSync(current_command_log_file_name, JSON.stringify(updated_command_log, null, 2), {flag:'w'});
    } catch (error) {
        console.trace(`Unable to save to command log file!`, error);
    }
    //#endregion central command logging

    //#region central anonymous command logging for bot staff
    const anonymous_command_log_entry = {
        timestamp:`${command_timestamp}`,
        command:`${message.content}`
    };
    const central_anonymous_command_logging_channel = client.channels.cache.get(bot_central_anonymous_command_log_channel_id);
    central_anonymous_command_logging_channel.send(`${'```'}json\n${JSON.stringify(anonymous_command_log_entry, null, 2)}\n${'```'}`).catch(console.trace);
    //#endregion central anonymous command logging for bot staff

    //#region guild command logging
    const guild_command_logging_channel = message.guild.channels.cache.find(channel => channel.type === 'text' && channel.name === bot_command_log_channel_name);
    guild_command_logging_channel?.send(new CustomRichEmbed({
        author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
        title:'Command Used',
        description:`${'```'}\n${message.content}\n${'```'}`,
        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${command_timestamp}`}
    })).catch(console.warn);
    //#endregion guild command logging

    //#region configure permission handlers for the command
    const guild_moderator_roles = guild_config.moderator_roles ?? [];
    const guild_admin_roles = guild_config.admin_roles ?? [];

    const hasGuildModeratorRole = message.member.roles.cache.filter(role => guild_moderator_roles.includes(role.id)).size > 0;
    const hasGuildAdminRole = message.member.roles.cache.filter(role => guild_admin_roles.includes(role.id)).size > 0;
    const hasGuildAdminPerm = message.member.hasPermission('ADMINISTRATOR');

    const hasBotSuperGuildAdmin = isSuperPersonAllowed(isSuperPerson(message.member.id), 'guild_admin');
    const hasBotOwner = isThisBotsOwner(message.member.id);

    const isGuildModeratorWorthy = hasGuildModeratorRole;
    const isGuildAdminWorthy = hasGuildAdminRole || hasGuildAdminPerm;
    const isSuperWorthy = hasBotSuperGuildAdmin;
    const isOwnerWorthy = hasBotOwner;

    let user_access_level = DisBotCommand.access_levels.GLOBAL_USER;
    if (isGuildModeratorWorthy) user_access_level = DisBotCommand.access_levels.GUILD_MOD;
    if (isGuildAdminWorthy) user_access_level = DisBotCommand.access_levels.GUILD_ADMIN;
    if (isSuperWorthy) user_access_level = DisBotCommand.access_levels.BOT_SUPER;
    if (isOwnerWorthy) user_access_level = DisBotCommand.access_levels.BOT_OWNER;
    //#endregion configure permission handlers for the command

    if (user_access_level < command.access_level) {
        // the user doesn't have permission to use this command
        message.channel.send(new CustomRichEmbed({
            color:0xFF00FF,
            title:'Sorry but you do not have permission to use this command!',
            description:'You must ascend in order to obtain the power you desire.\n\nIf you are a moderator or admin in this server, tell one of your server administrators about the commands below.',
            fields:[
                {name:'Setting Bot Moderator Roles', value:`\`\`\`${command_prefix}set_moderator_roles @role1 @role2 @role3 ...\`\`\``},
                {name:'Setting Bot Admin Roles', value:`\`\`\`${command_prefix}set_admin_roles @role1 @role2 @role3 ...\`\`\``}
            ]
        }, message));
    } else {
        // the user has permission to use this command
        if ([DisBotCommander.categories.ADMINISTRATOR, DisBotCommander.categories.GUILD_SETTINGS].includes(command.category)) {
            // log admin commands used in the guild
            logAdminCommandsToGuild(message);
        }
        try {
            await command.execute(Discord, client, message, {
                command_prefix:`${command_prefix}`,
                discord_command:discord_command,
                command_args:command_args,
                clean_command_args:clean_command_args,
                bot_special_text_channels:bot_special_text_channels,
                guild_config_manipulator:guild_config_manipulator
            });
        } catch (error) {
            logUserError(message, error);
        }
    }
});

//---------------------------------------------------------------------------------------------------------------//

//#region register the commands
try {
    const command_files_directory_path = path.join(process.cwd(), './commands/');
    const command_files = recursiveReadDirectory(command_files_directory_path).filter(file => file.endsWith('.js'));
    for (const command_file of command_files) {
        const command_file_path = path.join(process.cwd(), './commands/', command_file);
        const command_to_register = require(command_file_path);
        DisBotCommander.registerCommand(command_to_register);
    }
} catch (error) {
    console.trace(`An issue occurred while registering the commands:`, error);
}
//#endregion register the commands

//---------------------------------------------------------------------------------------------------------------//

//#region prevent the bot from crashing for these situations
process.on('unhandledRejection', (reason, promise) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('unhandledRejection at:', reason?.stack ?? reason, promise);
    console.error('----------------------------------------------------------------------------------------------------------------');
});

process.on('uncaughtException', (error) => {
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`${moment()}`);
    console.trace('uncaughtException at:', error);
    console.error('----------------------------------------------------------------------------------------------------------------');
});
//#endregion prevent the bot from crashing for these situations
