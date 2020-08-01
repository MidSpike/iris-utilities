'use strict';

require('dotenv').config(); // process.env.*
require('manakin').global; // colors for Console.*
require('./server.js')(); // start the bots web server

//---------------------------------------------------------------------------------------------------------------//

const os = require('os'); os.setPriority(0, os.constants.priority.PRIORITY_HIGH);
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const axios = require('axios');

const safe_stringify = require('json-stringify-safe');

const validator = require('validator');

const mathjs = require('mathjs');

const moment = require('moment-timezone');
const Sugar = require('sugar');
const schedule = require('node-schedule');

const { Discord, client } = require('./bot.js');

const emoji = require('node-emoji');

const HtmlEntitiesParser = require('html-entities').AllHtmlEntities;
const htmlEntitiesParser = new HtmlEntitiesParser();

const LanguageDetect = require('languagedetect');
const languageDetector = new LanguageDetect();

const translate = require('translate-google');
const googleIt = require('google-it');

const dogeify = require('dogeify-js');

const Akinator_API = require('aki-api').Aki;

const urlParser = require('url-parameter-parser');
const validUrl = require('valid-url');

const getVideoId = require('get-video-id');

//---------------------------------------------------------------------------------------------------------------//

const bot_config = require('./config.json');
const util = require('./utilities.js');

const google_languages_json = require('./files/google_languages.json');
const ibm_languages_json = require('./files/ibm_languages.json');
const roasts_json = fs.readFileSync('./files/roasts.json');
const magic8ball_json = fs.readFileSync('./files/8ball.json');

//---------------------------------------------------------------------------------------------------------------//

//#region Utility Functions
const random_range_inclusive = util.random_range_inclusive;
const array_make = util.array_make;
const array_random = util.array_random;
const array_insert = util.array_insert;
const array_shuffle = util.array_shuffle;
const array_chunks = util.array_chunks;
const object_sort = util.object_sort;
const getReadableTime = util.getReadableTime;
//#endregion

//#region Bot Files
const bot_error_log_file = process.env.BOT_ERROR_LOG_FILE;
const bot_command_log_file = process.env.BOT_COMMAND_LOG_FILE;
const bot_update_log_file = process.env.BOT_UPDATE_LOG_FILE;
const bot_guild_configs_file = process.env.BOT_GUILD_CONFIGS_FILE;
const bot_reminder_configs_file = process.env.BOT_REMINDER_CONFIGS_FILE;
const bot_blacklisted_guilds_file = process.env.BOT_BLACKLISTED_GUILDS_FILE;
const bot_blacklisted_users_file = process.env.BOT_BLACKLISTED_USERS_FILE;
//#endregion

//#region Bot Globals
const bot_short_name = bot_config.short_name;
const bot_common_name = bot_config.common_name;
const bot_long_name = bot_config.long_name;
const bot_id = bot_config.client_id;
const bot_version = bot_config.public_version;
const bot_permissions_bits = bot_config.permissions;
const bot_website = bot_config.website;
const bot_cdn_url = process.env.BOT_CDN_URL;
const bot_api_url = process.env.BOT_API_URL;
const bot_invite_link = `https://discordapp.com/oauth2/authorize?&client_id=${bot_id}&scope=bot&permissions=${bot_permissions_bits}`;
const bot_support_guild_invite_url = 'https://discord.gg/BXJpS6g';
const bot_support_guild_id = bot_config.support_guild_id;
const bot_logging_guild_id = bot_config.logging_guild_id;
const bot_appeals_guild_id = bot_config.appeals_guild_id;
const bot_default_guild_config = bot_config.default_guild_config;
//#endregion

//#region Bot Channels
const bot_special_channels = bot_config.special_channels;
const bot_special_channels_category_name = bot_special_channels.SPECIAL_CHANNELS_CATEGORY.public_name;

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

const bot_archived_channels_category_name = bot_special_channels.ARCHIVED_CHANNELS_CATEGORY.public_name;

const bot_central_logging_channels = bot_config.logging_guild_channels;
const bot_central_errors_channel_id = bot_central_logging_channels.ERRORS.id;
const bot_central_guild_history_channel_id = bot_central_logging_channels.GUILD_HISTORY.id;
const bot_central_feedback_channel_id = bot_central_logging_channels.COMMUNITY_FEEDBACK.id;
const bot_central_command_log_channel_id = bot_central_logging_channels.ANONYMOUS_COMMAND_LOG.id;
const bot_central_history_deletion_requests_channel_id = bot_central_logging_channels.HISTORY_DELETION_REQUESTS.id;
//#endregion Bot Channels

//#region Bot Controllers
const bot_owner_discord_id = bot_config.owner_id;
const super_perms = bot_config.super_perms;
const super_people = bot_config.super_people;
const fetch_bot_owner_tag = () => `@${client.users.cache.get(bot_owner_discord_id).tag}`;
const isThisBot = (user_id) => user_id === client.user.id;
const isThisBotsOwner = (user_id) => user_id === bot_owner_discord_id;
const isSuperPerson = (user_id) => super_people.find(super_person => user_id === super_person.id) ?? false;
const isSuperPersonAllowed = (super_person, permission_flag) => {
    if (super_person) {
        const allowed_all_permissions = super_person?.allowed_permissions?.includes('*') ?? false;
        const allowed_permission_flag = super_person?.allowed_permissions?.includes(permission_flag) ?? false;
        const denied_all_permissions = super_person?.denied_permissions?.includes('*') ?? false;
        const denied_permission_flag = super_person?.denied_permissions?.includes(permission_flag) ?? false;
        return ((allowed_all_permissions && !denied_all_permissions) || (allowed_permission_flag && !denied_permission_flag));
    } else {
        return false;
    }
};
//#endregion Bot Controllers

/* Servers Using Music */
const { disBotServers } = require('./src/disBotServers.js')
const servers = disBotServers;
// const servers = {/*
//     'guild_id':{
//         queue_manager,
//         volume_manager,
//         audio_controller,
//         dispatcher,
//     }
// */};

//---------------------------------------------------------------------------------------------------------------//

function botHasPerms(user_message, required_perms=['ADMINISTRATOR']) {
    if (!user_message.guild.me.hasPermission(required_perms)) {// The bot doesn't have permission
        user_message.channel.send(new CustomRichEmbed({
            color:0xFF0000,
            title:'Uh Oh! Something went wrong!',
            description:`${bot_common_name} is missing the following permission(s):\n${'```'}\n${required_perms.join('\n')}\n${'```'}You cannot perform this command without ${bot_common_name} having permission!`
        }, user_message));
        return false;
    } else {
        return true;
    }
}

//---------------------------------------------------------------------------------------------------------------//

const { CustomRichEmbed } = require('./src/CustomRichEmbed.js');

//---------------------------------------------------------------------------------------------------------------//

const fallback_user_error = new Error('Something went horribly wrong! There is no error information!');
function logUserError(user_message, error=fallback_user_error) {
    const error_id = util.uniqueId();
    const error_timestamp = moment();
    const error_message = new CustomRichEmbed({
        color:0xFF0000,
        author:{iconURL:user_message.author.displayAvatarURL({dynamic:true}), name:`@${user_message.author.tag} (${user_message.author.id})`},
        title:`An Error Has Occurred With ${bot_common_name}!`,
        description:`If you need assistance, please join the [${bot_common_name} Support Server](${bot_support_guild_invite_url})!`,
        fields:[
            {name:'Guild:', value:`${user_message.guild.name} (${user_message.guild.id})`},
            {name:'Channel:', value:`#${user_message.channel.name} (${user_message.channel.id})`},
            {name:'User:', value:`@${user_message.author.tag} (${user_message.author.id})`},
            {name:'Error Id:', value:`${error_id}`},
            {name:'Timestamp:', value:`${error_timestamp}`},
            {name:'Information:', value:`${'```'}\n${error}${'```'}`}
        ]
    });
    user_message.channel.send(error_message); // Send error to the user
    client.channels.cache.get(bot_central_errors_channel_id).send(error_message);  // Send error to central discord log
    console.error('----------------------------------------------------------------------------------------------------------------');
    console.error(`Error In Server ${user_message.guild.name}`);
    console.error(`Caused by @${user_message.author.tag} (${user_message.author.id})`);
    console.error(`Command Used: ${user_message.cleanContent}`);
    console.trace(error);
    console.error('----------------------------------------------------------------------------------------------------------------');
    fs.appendFile(bot_error_log_file, [
        `Id: ${error_id}`,
        `Timestamp: ${error_timestamp}`,
        `Guild: ${user_message.guild.name} (${user_message.guild.id})`,
        `Channel: #${user_message.channel.name} (${user_message.channel.id})`,
        `User: @${user_message.author.tag} (${user_message.author.id})`,
        `Command: ${user_message}`,
        `${error}`,
        `----------------------------------------------------------------------------------------------------------------\n`
    ].join('\n'), (errorWhileLoggingToFile) => {
        if (errorWhileLoggingToFile) throw errorWhileLoggingToFile;
    });
}

//---------------------------------------------------------------------------------------------------------------//

async function generateInviteToGuild(guild_id, invite_reason='created invite via a command that was used in this server') {
    const guild = client.guilds.cache.get(guild_id);
    const first_channel = guild.channels.cache.filter(channel => channel.type === 'text').first(); // MUST BE TEXT-CHANNEL
    return await first_channel?.createInvite({unique:true, maxUses:5, reason:invite_reason});
}

//---------------------------------------------------------------------------------------------------------------//

async function sendLargeMessage(channel_id, large_message, code_block_lang='') {
    const message_chunks = `${large_message}`.match(/[^]{1,1500}/g); // Split the message into 1500 character long chunks
    for (const message_chunk of message_chunks) {
        client.channels.cache.get(channel_id).send(`${'```'}${code_block_lang}\n${message_chunk}\n${'```'}`);
        await util.Timer(1000);
    }
}

//---------------------------------------------------------------------------------------------------------------//

const zero_to_nine_as_words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
function numberToWord(num) {
    return zero_to_nine_as_words[num];
}

function numberToEmoji(num) {
    return util.findCustomEmoji(`bot_emoji_${zero_to_nine_as_words[num]}`);
}

function constructNumberUsingEmoji(num) {
    const num_as_digits = `${num}`.split('');
    const arr_of_emojis = num_as_digits.map((value, index) => util.findCustomEmoji(`bot_emoji_${zero_to_nine_as_words[parseInt(value)]}`));
    const constructed_emojis_from_number = arr_of_emojis.join('');
    return constructed_emojis_from_number;
}

//---------------------------------------------------------------------------------------------------------------//

function sendConfirmationEmbed(confirm_user_id, channel_id, delete_after_selection=true, embed_contents='Default Embed', yes_callback=(discord_embed)=>{}, no_callback=(discord_embed)=>{}) {
    client.channels.cache.get(channel_id).send(embed_contents).then(async discord_embed => {
        if (!discord_embed) {return;}
        const bot_emoji_checkmark = util.findCustomEmoji('bot_emoji_checkmark');
        const bot_emoji_close = util.findCustomEmoji('bot_emoji_close');
        await discord_embed.react(bot_emoji_checkmark);
        await discord_embed.react(bot_emoji_close);
        discord_embed.createReactionCollector(filter => true).on('collect', reaction => {
            if (reaction.users.cache.get(confirm_user_id) && reaction.users.cache.filter(user => user.bot === false).size > 0) {
                if (reaction.emoji.name === 'bot_emoji_checkmark') {
                    if (delete_after_selection) discord_embed.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    yes_callback(discord_embed);
                } else if (reaction.emoji.name === 'bot_emoji_close') {
                    if (delete_after_selection) discord_embed.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    no_callback(discord_embed);
                }
            }
        });
    });
}

const options_message_reactions_template = [{emoji_name:'white_check_mark', cooldown:undefined, callback:(options_message, collected_reaction, user)=>{}}, {emoji_name:'x', cooldown:undefined, callback:(options_message, collected_reaction, user)=>{}}];
async function sendOptionsMessage(channel_id, embed, reaction_options=options_message_reactions_template, confirmation_user_id=undefined) {
    const options_message = await client.channels.cache.get(channel_id).send(embed);
    const reaction_promises = reaction_options.map(reaction_option => async () => { // This needs to be a synchronous lambda returning an asynchronous lambda
        const reaction_option_emoji = util.findCustomEmoji(reaction_option.emoji_name) ?? emoji.get(reaction_option.emoji_name);
        if (!reaction_option_emoji) return;
        if (options_message.deleted) return; // Don't add reactions to deleted messages
        const bot_reaction = await options_message.react(reaction_option_emoji);
        const filter = (user_reaction, user) => {
            const isNotBot = user.bot === false;
            const emojiMatches = bot_reaction.emoji.name === user_reaction.emoji.name;
            const confirmationUserMatches = confirmation_user_id ? confirmation_user_id === user.id : true;
            return (isNotBot && emojiMatches && confirmationUserMatches);
        };
        const cooldown_time_ms = reaction_option.cooldown ?? 1500;
        let last_time_of_action = Date.now() - cooldown_time_ms; // subtract the cooldown so that the button can be pressed immediately after it shows up
        function _isLastTimeOfActionRecent() {
            const recent_time_of_action = Date.now();
            if (recent_time_of_action - last_time_of_action < cooldown_time_ms) {
                last_time_of_action = Date.now();
                return true;
            } else {
                last_time_of_action = Date.now();
                return false;
            }
        }
        options_message.createReactionCollector(filter).on('collect', (collected_reaction, user) => {
            if (_isLastTimeOfActionRecent()) return; // Force the user to wait before clicking again
            reaction_option.callback(options_message, collected_reaction, user);
        });
        return;
    });
    for (let reaction_promise of reaction_promises) {// Execute Each Reaction Sequentially
        await reaction_promise();
    }
    return options_message;
}

function removeUserReactionsFromMessage(message) {
    if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
        message.reactions.cache.forEach(reaction => {
            reaction.users.cache.filter(user => !user.bot).forEach(nonBotUser => {
                reaction.users.remove(nonBotUser);
            });
        });
    }
}

async function removeMessageFromChannel(channel_id, message_id) {
    const channel_containing_message = client.channels.cache.get(channel_id);
    if (channel_containing_message) {
        const recent_100_messages_in_channel = await channel_containing_message.messages.fetch({limit:100});
        const message_to_delete = recent_100_messages_in_channel.find(m => m.id === message_id);
        if (message_to_delete) {
            const removed_message = await message_to_delete.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
            return removed_message;
        } else {
            throw new Error('Message Not Found!');
        }
    } else {
        throw new Error('Channel Not Found!');
    }
}

function sendVolumeControllerEmbed(channel_id, old_message=undefined) {
    const guild = client.channels.cache.get(channel_id).guild;
    const server = servers[guild.id];
    const makeEmbed = () => new CustomRichEmbed({
        title:`The Current Volume Is: ${constructNumberUsingEmoji(server.volume_manager.volume)}`
    }, old_message);
    sendOptionsMessage(channel_id, makeEmbed(), [
        {
            emoji_name:'bot_emoji_mute',
            cooldown:500,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                server.volume_manager.toggleMute();
                options_message.edit(new CustomRichEmbed({
                    author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                    title:`${server.volume_manager.muted ? 'Muted' : 'Unmuted'} Audio Playback`
                }));
            }
        }, {
            emoji_name:'bot_emoji_volume_down',
            cooldown:500,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                server.volume_manager.decreaseVolume();
                options_message.edit(new CustomRichEmbed({
                    author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                    title:`Set The Volume To ${constructNumberUsingEmoji(server.volume_manager.volume)}`
                }));
            }
        }, {
            emoji_name:'bot_emoji_volume_up',
            cooldown:500,
            callback:async (options_message, collected_reaction, user) => {
                const guild_config = new GuildConfigManipulator(guild.id).config;
                removeUserReactionsFromMessage(options_message);
                const old_volume = server.volume_manager.volume;
                const [updated_volume_manager, increase_amount] = await server.volume_manager.increaseVolume();
                const new_volume = updated_volume_manager.volume;
                options_message.edit(new CustomRichEmbed({
                    author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                    title:`Set The Volume To ${constructNumberUsingEmoji(server.volume_manager.volume)}`,
                    description:(new_volume === old_volume ? `The maximum volume can be increased beyond this!\nIf you are an Administrator, check out:${'```'}\n${guild_config.command_prefix}set_volume_maximum\n${'```'}` : undefined)
                }));
            }
        }
    ]);
}
function sendMusicControllerEmbed(channel_id, old_message=undefined) {
    const embed_title = 'Audio Controller';
    const server = servers[client.channels.cache.get(channel_id).guild.id];
    const makeEmbed = () => new CustomRichEmbed({title:`${embed_title}`}, old_message);
    sendOptionsMessage(channel_id, makeEmbed(), [
        {
            emoji_name:'bot_emoji_play_pause',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                if (server.dispatcher) {
                    if (server.dispatcher.paused) {
                        server.dispatcher.resume();
                        options_message.edit(new CustomRichEmbed({
                            author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                            title:`${embed_title}`,
                            description:'Resumed Music'
                        }));
                    } else {
                        server.dispatcher.pause();
                        options_message.edit(new CustomRichEmbed({
                            author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                            title:`${embed_title}`,
                            description:'Paused Music'
                        }));
                    }
                }
            }
        }, {
            emoji_name:'bot_emoji_stop_square',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                if (server.dispatcher && server.dispatcher.player && server.dispatcher.player.voiceConnection && server.dispatcher.player.voiceConnection.channel) {
                    server.queue_manager.clearItems(true);
                    server.dispatcher.player.voiceConnection.channel.leave();
                    options_message.edit(new CustomRichEmbed({
                        author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                        title:`${embed_title}`,
                        description:'Stopped Music'
                    }));
                }
            }
        }, {
            emoji_name:'bot_emoji_skip',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                if (server.dispatcher) {
                    server.dispatcher.end();
                    options_message.edit(new CustomRichEmbed({
                        author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                        title:`${embed_title}`,
                        description:'Skipped Music'
                    }));
                }
            }
        }, {
            emoji_name:'bot_emoji_shuffle',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                server.queue_manager.shuffleItems();
                options_message.edit(new CustomRichEmbed({
                    author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                    title:`${embed_title}`,
                    description:'Shuffled Music'
                }));
            }
        }, {
            emoji_name:'bot_emoji_repeat_all',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                server.queue_manager.setLoopType('multiple');
                server.queue_manager.toggleLoop();
                options_message.edit(new CustomRichEmbed({
                    author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                    title:`${embed_title}`,
                    description:`${server.queue_manager.loop_enabled ? 'Started' : 'Stopped'} Repeating Entire Queue`
                }));
            }
        }, {
            emoji_name:'bot_emoji_repeat_one',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                server.queue_manager.setLoopType('single');
                server.queue_manager.toggleLoop();
                options_message.edit(new CustomRichEmbed({
                    author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                    title:`${embed_title}`,
                    description:`${server.queue_manager.loop_enabled ? 'Started' : 'Stopped'} Repeating First Item`
                }));
            }
        }, {
            emoji_name:'bot_emoji_volume_up',
            cooldown:500,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                sendVolumeControllerEmbed(channel_id);
            }
        }
    ]);
}

function sendYtDiscordEmbed(user_message, videoInfo, status='Playing') {
    const server = servers[user_message.guild.id];
    const guild_config_manipulator = new GuildConfigManipulator(user_message.guild.id);
    const guild_config = guild_config_manipulator.config;
    const player_description = guild_config.player_description === 'enabled';
    let show_description = undefined;
    function makeYTEmbed() {
        const show_player_description = (show_description !== undefined ? show_description : player_description);
        return new CustomRichEmbed({
            title:`${server.queue_manager.loop_enabled ? 'Looping' : (server.queue_manager.autoplay_enabled ? 'Autoplaying' : status)}: ${videoInfo.title}`,
            description:(show_player_description ? ([
                `Author: [${videoInfo.author.name}](https://youtube.com/channel/${videoInfo.author.channel_url})`,
                `Uploaded: ${moment(videoInfo.published).format('YYYY-MM-DD')}`,
                `Duration: ${getReadableTime(parseInt(videoInfo.length_seconds))}`,
                `Age Restricted: ${videoInfo.age_restricted ? 'Yes' : 'No'}`,
                `Rating: ${Math.trunc((videoInfo.likes / (videoInfo.likes + videoInfo.dislikes)) * 100)}% of people like this`,
                `Likes: ${videoInfo.likes}`,
                `Dislikes: ${videoInfo.dislikes}`,
                `Views: ${videoInfo.player_response.videoDetails.viewCount}`,
                `Link: [https://youtu.be/${videoInfo.video_id}](https://youtu.be/${videoInfo.video_id})`,
                `Volume: ${server.volume_manager.volume}%`
            ].join('\n')) : `[https://youtu.be/${videoInfo.video_id}](https://youtu.be/${videoInfo.video_id})`),
            thumbnail:(show_player_description ? `${bot_cdn_url}/youtube_logo.png` : `${videoInfo.player_response.videoDetails.thumbnail.thumbnails.slice(-1).pop().url}`),
            image:(show_description ? `${videoInfo.player_response.videoDetails.thumbnail.thumbnails.slice(-1).pop().url}` : undefined)
        }, user_message);
    }
    sendOptionsMessage(user_message.channel.id, makeYTEmbed(show_description), [
        {
            emoji_name:'bot_emoji_information',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                show_description = !show_description;
                options_message.edit(makeYTEmbed());
            }
        }, {
            emoji_name:'bot_emoji_music',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                sendMusicControllerEmbed(user_message.channel.id);
            }
        }, {
            emoji_name:'bot_emoji_volume_up',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                sendVolumeControllerEmbed(user_message.channel.id);
            }
        }
    ]);
}

//---------------------------------------------------------------------------------------------------------------//

class GuildConfigManipulator {
    #configs_file = bot_guild_configs_file;
    constructor(guild_id) {
        this.guild_id = guild_id;
    }
    get configs() {
        return JSON.parse(fs.readFileSync(this.#configs_file)) || {};
    }
    get config() {
        return this.configs[this.guild_id] || {};
    }
    async modifyConfig(new_config_data={}) {// This will make a new config if none is found
        fs.writeFileSync(this.#configs_file, JSON.stringify({
            ...this.configs,
            [this.guild_id]: object_sort({
                ...this.config,
                ...new_config_data
            })
        }, null, 4));
        return this;
    }
}

//---------------------------------------------------------------------------------------------------------------//

class ReminderManager {
    constructor() {
        this._reminders = {};
        this._reminder_configs_file = bot_reminder_configs_file;
    }
    get reminders() {
        return this._reminders;
    }
    add(reminder) {
        this._reminders = {
            ...this.reminders,
            [reminder.id]:reminder
        };
        schedule.scheduleJob(reminder.date_time, () => {
            const user_to_dm = client.users.cache.get(reminder.user_id);
            if (!user_to_dm) return;
            user_to_dm.createDM().then(dmChannel => dmChannel.send(new CustomRichEmbed({title:'Here is your reminder!', description:`${reminder.message}`})));
            this.remove(reminder).save();
        });
        return this;
    }
    remove(reminder) {
        delete this._reminders[reminder.id];
        return this;
    }
    save() {
        fs.writeFileSync(this._reminder_configs_file, JSON.stringify(this.reminders, null, 4));
        return this;
    }
}
const reminderManager = new ReminderManager();

class Reminder {
    constructor(user_id, date_time, message) {
        this.id = util.uniqueId();
        this.user_id = user_id;
        this.date_time = date_time;
        this.message = message;
    }
}

//---------------------------------------------------------------------------------------------------------------//

const { QueueManager, QueueItem, QueueItemPlayer } = require('./src/QueueManager.js');

//---------------------------------------------------------------------------------------------------------------//

const { AudioController } = require('./src/AudioController.js');

//---------------------------------------------------------------------------------------------------------------//

/** @TODO Move this to `./src/VolumeManager.js` after moving `GuildConfigManipulator` */
class VolumeManager {
    constructor(guild) {
        this._guild = guild;
        this._muted = false;
        this._volume = 50;
        this._safety_multiplier = 0.0040;
        this._last_volume = 50;
        this._fallback_volume = 50;
        this._fallback_guild_volume_multiplier = 0.0040;
        this._fallback_guild_volume_maximum = 100;
    }
    get muted() {
        return this._muted;
    }
    get volume() {
        return this._volume;
    }
    get last_volume() {
        return this._last_volume;
    }
    get multiplier() {
        const guild_volume_multiplier = new GuildConfigManipulator(this._guild.id).config.volume_multiplier ?? this._fallback_guild_volume_multiplier;
        return guild_volume_multiplier * this._safety_multiplier;
    }
    get maximum() {
        const guild_volume_maximum = new GuildConfigManipulator(this._guild.id).config.volume_maximum ?? this._fallback_guild_volume_maximum;
        return guild_volume_maximum;
    }
    async decreaseVolume(decrease_amount=10, clamp_volume=true) {
        this.setVolume(this.volume - decrease_amount, undefined, clamp_volume);
        return [this, decrease_amount];
    }
    async increaseVolume(increase_amount=10, clamp_volume=true) {
        this.setVolume(this.volume + increase_amount, undefined, clamp_volume);
        return [this, increase_amount];
    }
    async setVolume(volume_input=this._fallback_volume, update_last_volume=true, clamp_volume=true) {
        if (this._guild.voice?.connection?.dispatcher?.setVolume) {
            this._last_volume = update_last_volume ? this.volume : this.last_volume;

            this._volume = util.math_clamp(volume_input, 0, clamp_volume ? this.maximum : Number.MAX_SAFE_INTEGER);

            this._guild.voice.connection.dispatcher.setVolume(this.multiplier * this.volume);
            if (typeof this.volume !== 'number' || isNaN(this.volume)) {
                console.trace('ERROR: Volume is somehow not a number!');
                this._volume = this._fallback_volume;
            }
        }
        return this;
    }
    async toggleMute(override=undefined) {
        this._muted = override ?? !this.muted;
        this.setVolume(this.muted ? 0 : this.last_volume, false);
        return this;
    }
}

//---------------------------------------------------------------------------------------------------------------//

const { getDiscordCommand, getDiscordCommandArgs, getDiscordCleanCommandArgs } = require('./src/DisBotCommander.js');
const { DisBotCommand, DisBotCommander } = require('./src/DisBotCommander.js');

//---------------------------------------------------------------------------------------------------------------//

const { createConnection } = require('./src/createConnection.js');
const { playStream } = require('./src/playStream.js');

//---------------------------------------------------------------------------------------------------------------//

function detect_broadcastify(search_query='') {
    const is_broadcastify_url = !!search_query.match('https://www.broadcastify.com/webPlayer/')?.[0];
    return is_broadcastify_url;
}
async function playBroadcastify(old_message, search_query, playnext=false) {
    const server = servers[old_message.guild.id];
    const broadcast_id = search_query.match(/(\d+)/)?.[0]; // ID should be numbers only
    if (!broadcast_id) return;
    const broadcast_url = `https://broadcastify.cdnstream1.com/${broadcast_id}`;
    const voice_connection = await createConnection(old_message.member.voice.channel);
    const streamMaker = async () => await `${broadcast_url}`;
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, streamMaker, 150, () => {
        old_message.channel.send(new CustomRichEmbed({
            title:'Playing Broadcastify Stream',
            description:`[Stream Link - ${broadcast_id}](${broadcast_url})`
        }, old_message));
    }, () => {}, (error) => {
        logUserError(old_message, `${error ?? 'Unknown Playback Error!'}`);
    });
    server.queue_manager.addItem(new QueueItem('other', player, `Broadcastify Stream`), (playnext ? 2 : undefined)).then(() => {
        if (server.queue_manager.queue.length > 1) {
            old_message.channel.send(new CustomRichEmbed({
                title:'Added Broadcastify Stream',
                description:`[Stream Link - ${broadcast_id}](${broadcast_url})`
            }, old_message));
        }
    });
}

function playYouTube(old_message, search_query, playnext=false) {
    if (!old_message.member?.voice?.channel) {
        old_message.channel.send(new CustomRichEmbed({
            color:0xFFFF00,
            title:'Whoops!',
            description:'You need to be in a voice channel to use that command!'
        }, old_message));
        return;
    }
    const server = servers[old_message.guild.id];
    const voice_channel = old_message.member.voice?.channel; // Store the current voice channel of the user
    if (!voice_channel) {
        logUserError(old_message, `The user ran a youtube command without having a valid voice channel declared!`);
        return;
    }
    old_message.channel.send(new CustomRichEmbed({title:'Searching YouTube For:', description:`${'```'}\n${search_query}${'```'}`})).then(async search_message => {
        async function _playYT(searchString, send_embed=true) {
            const potentialVideoId = getVideoId(searchString)?.id ?? (await util.forcePromise(util.forceYouTubeSearch(searchString, 1), 7500, undefined))?.[0]?.id;
            if (potentialVideoId) {
                const videoInfo = (await axios.get(`${bot_api_url}/ytinfo?video_id=${encodeURI(potentialVideoId)}`))?.data;
                if (!videoInfo) {
                    logUserError(old_message, `Unable to fetch video info from youtube!`);
                    return;
                }
                const voice_connection = await createConnection(voice_channel); // Do not locally declare `voice_channel` for edge cases such as recursive _playYT()
                const streamMaker = async () => await `${bot_api_url}/ytdl?url=${encodeURI(videoInfo.video_url)}`;
                if (!search_message.deleted) search_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                if (parseInt(videoInfo.length_seconds) === 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Woah there buddy!',
                        description:`Live streams aren't supported!`,
                        fields:[
                            {name:'Offending Live Stream Title', value:`${videoInfo.title}`},
                            {name:'Offending Live Stream URL', value:`${videoInfo.video_url}`}
                        ]
                    }, old_message));
                    return; // Don't allow live streams to play
                }
                const player = new QueueItemPlayer(server.queue_manager, voice_connection, streamMaker, undefined, () => {
                    sendYtDiscordEmbed(old_message, videoInfo, 'Playing');
                }, () => {
                    if (server.queue_manager.queue.length === 0 && server.queue_manager.autoplay_enabled) {
                        _playYT(`https://youtu.be/${array_random(videoInfo.related_videos.slice(0,3)).id}`)
                    }
                }, (error) => {
                    logUserError(old_message, `${error ?? 'Unknown Playback Error!'}`);
                });
                server.queue_manager.addItem(new QueueItem('youtube', player, `${videoInfo.title}`, {videoInfo:videoInfo}), (playnext ? 2 : undefined)).then(() => {
                    if (server.queue_manager.queue.length > 1 && send_embed) {
                        sendYtDiscordEmbed(old_message, videoInfo, 'Added');
                    }
                });
            } else {
                if (!search_message.deleted) search_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                old_message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`Uh Oh! ${old_message.author.username}`,
                    description:`Your search for the following failed to yield any results!${'```'}\n${searchString}\n${'```'}\nTry being a bit more specific next time or try searching again!\n\nSometimes YouTube gets excited by all of the searches and derps out!`
                }, old_message));
            }
        }
        const potentialPlaylistId = validUrl.isUri(search_query) ? urlParser(search_query).list ?? undefined : undefined;
        if (potentialPlaylistId) {
            const playlist_id_to_lookup = potentialPlaylistId;
            const yt_playlist_api_url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlist_id_to_lookup}&key=${process.env.YOUTUBE_API_TOKEN}`
            const yt_playlist_response = await axios.get(yt_playlist_api_url);
            const playlist_items = yt_playlist_response.data.items;
            
            if (!search_message.deleted) search_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
            const confirmEmbed = new CustomRichEmbed({
                title:`Are you sure that you want this to play as a playlist?`,
                description:`\`\`\`fix\nWARNING! YOU CAN NOT STOP A PLAYLIST FROM ADDING ITEMS!\n\`\`\`If you don't want this to play as a playlist, then click on the ${util.findCustomEmoji('bot_emoji_close')}.`
            }, old_message);
            sendOptionsMessage(old_message.channel.id, confirmEmbed, [
                {
                    emoji_name:'bot_emoji_checkmark',
                    callback:async (options_message, collected_reaction, user) => {
                        await options_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                        await options_message.channel.send(new CustomRichEmbed({
                            title:'Started playing as a playlist'
                        }, old_message));
                        for (const index in playlist_items) {
                            if (index > 0 && !options_message.guild.me?.voice?.connection) break; // Stop the loop
                            const playlist_item = playlist_items[index];
                            const playlist_item_video_id = playlist_item.snippet.resourceId.videoId;
                            _playYT(playlist_item_video_id, false);
                            await util.Timer(10000); // Add an item every 10 seconds
                        }
                    }
                }, {
                    emoji_name:'bot_emoji_close',
                    callback:(options_message, collected_reaction, user) => {
                        options_message.edit(new CustomRichEmbed({
                            title:'Started playing as a song'
                        }, old_message));
                        _playYT(search_query);
                    }
                }
            ]);
        } else {
            _playYT(search_query); // This is not a playlist, so play it
        }
    });
}

async function detect_remote_mp3(search_query='') {
    const ends_with_dot_mp3 = search_query.endsWith('.mp3');
    if (ends_with_dot_mp3) {
        return true;
    } else if (validator.isURL(search_query)) {// start mime-check on remote resource
        try {
            const response_to_url = await util.forcePromise(axios.head(search_query), 1000, undefined);
            const content_type = response_to_url?.headers?.['content-type'];
            const is_audio_mpeg = content_type === 'audio/mpeg';
            return is_audio_mpeg;
        } catch {
            return false;
        }
    } else {
        return false;
    }
}
async function playRemoteMP3(old_message, remote_mp3_path, playnext=false) {
    const server = servers[old_message.guild.id];
    const voice_connection = await createConnection(old_message.member.voice.channel);
    const stream_maker = () => `${remote_mp3_path}`;
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, stream_maker, 100, () => {
        old_message.channel.send(new CustomRichEmbed({
            title:'Playing A MP3 File From The Internet',
            description:`${'```'}\n${remote_mp3_path}\n${'```'}`
        }, old_message));
    }, () => {}, (error) => {
        console.warn(error);
    });
    server.queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name:`${remote_mp3_path}`}), (playnext ? 2 : undefined)).then(() => {
        if (server.queue_manager.queue.length > 1) {
            old_message.channel.send(new CustomRichEmbed({
                title:'Added A MP3 File From The Internet',
                description:`${'```'}\n${remote_mp3_path}\n${'```'}`
            }, old_message));
        }
    });
}

async function playUserUploadedMP3(old_message, playnext=false) {
    const server = servers[old_message.guild.id];
    const message_media = old_message.attachments.first();
    if (message_media) {
        if (message_media.attachment.endsWith('.mp3')) {
            const voice_connection = await createConnection(old_message.member.voice.channel);
            const stream_maker = () => `${message_media.attachment}`;
            const player = new QueueItemPlayer(server.queue_manager, voice_connection, stream_maker, 100, () => {
                old_message.channel.send(new CustomRichEmbed({
                    title:'Playing A MP3 File From Their Computer',
                    description:`${'```'}\n${message_media.name}${'```'}`
                }, old_message));
            }, () => {
                if (old_message.deletable) old_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
            }, (error) => {
                console.warn(error);
            });
            server.queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name:`${message_media.name}`}), (playnext ? 2 : undefined)).then(() => {
                if (server.queue_manager.queue.length > 1) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Added A MP3 File From Their Computer',
                        description:`${'```'}\n${message_media.name}${'```'}`
                    }, old_message));
                }
            });
        } else {
            old_message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Uh Oh!',
                description:`I wasn't able to play that mp3 file (if it even was one)!`
            }, old_message));
        }
    } else {
        old_message.channel.send(new CustomRichEmbed({
            color:0xFFFF00,
            title:'Did someone try playing an MP3?',
            description:`Its kinda hard to play an MP3 without one...\nNext time upload an mp3 in the same message!`
        }, old_message));
    }
}

async function playLocalMP3(old_message, file_path, hide_embed=false) {
    const server = servers[old_message.guild.id];
    const mp3_file_path = file_path;
    const mp3_file_name = path.basename(mp3_file_path);
    const voice_connection = await createConnection(old_message.member.voice.channel);
    const player = new QueueItemPlayer(server.queue_manager, voice_connection, ()=>mp3_file_path, 125, () => {
        if (!hide_embed) {
            old_message.channel.send(new CustomRichEmbed({
                title:'Playing MP3 File',
                description:`${mp3_file_name}`
            }, old_message));
        }
    });
    server.queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name:`${mp3_file_name}`})).then(() => {
        if (server.queue_manager.queue.length > 1) {
            if (!hide_embed) {
                old_message.channel.send(new CustomRichEmbed({
                    title:'Added MP3 File',
                    description:`${mp3_file_name}`
                }, old_message));
            }
        }
    });
}
function playLocalMP3s(old_message, files_path) {
    glob(`${files_path}*.mp3`, {}, (error, files) => {
        if (error) {logUserError(old_message, error); return;}
        playLocalMP3(old_message, array_random(files));
    });
}

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

    // The methodology used below will clone a property in all guild configs
    // old_guild_config['NEW_PROPERTY_NAME'] = old_guild_config['OLD_PROPERTY_NAME'];

    // The methodology used below will remove a property from all guild configs
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
function addServerToServers(guild) {
    servers[guild.id] = {
        ...(servers[guild.id] ?? {}),
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
    if (blacklisted_guilds.map(blacklisted_guild => blacklisted_guild.id).includes(guild.id)) {
        return true;
    }
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
        }).catch(() => {// Unable to send to blacklisted user
            message.channel.send(embed); // Send to guild instead
        });
        return true;
    }
}
function checkForBots(message) {
    if (message.author.bot) return true;
}

function checkForUserInGuildTimeout(message) {
    const guild_users_in_timeout = new GuildConfigManipulator(message.guild.id).config.users_in_timeout || [];
    if (guild_users_in_timeout.includes(message.author.id)) {
        message.delete({timeout:500}).then(old_message => {
            old_message.author.createDM().then(dmChannel => {
                dmChannel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`I'm sorry, you were put into an indefinite timeout in ${old_message.guild.name}.`,
                    description:'Currently all messages that you are trying to send in that server will be deleted!\nPlease contact an administrator on that discord server to be removed from timeout.',
                }));
            }).catch(console.warn);
        }).catch(error => console.warn(`Unable to delete message`, error));
        return;
    }
}

//---------------------------------------------------------------------------------------------------------------//

function sendNotAllowedCommand(message) {
    const embed = new CustomRichEmbed({
        color:0xFF00FF,
        title:'Unauthorized Access Detected!',
        description:`Sorry you aren't allowed to use: ${'```'}\n${message.cleanContent}${'```'}Try contacting a guild admin or an ${bot_common_name} admin if you believe this to be in fault.`,
        footer:null
    }, message);
    message.channel.send(embed).then(() => {
        message.author.createDM().then(dmChannel => dmChannel.send(embed));
    });
}

//---------------------------------------------------------------------------------------------------------------//

function logAdminCommandsToGuild(message, custom_log=undefined) {
    const moderation_log_channel = message.guild.channels.cache.find(channel => channel.name === bot_moderation_log_channel_name);
    if (!moderation_log_channel) return;
    moderation_log_channel.send(custom_log ? custom_log : new CustomRichEmbed({
        title:`An Admin Command Has Been Used!`,
        description:`Command Used:${'```'}\n${message.content}${'```'}`,
        fields:[
            {name:'Admin', value:`${message.author} (${message.author.id})`},
            {name:'Channel', value:`${message.channel}`},
            {name:'Message Link', value:`[Jump To Where The Command Was Used](${message.url})`}
        ]
    }));
}

//---------------------------------------------------------------------------------------------------------------//

client.on('warn', console.trace);
client.on('error', console.trace);

// client.on('rateLimit', (rateLimit) => {
//     console.log(`----------------------------------------------------------------------------------------------------------------`);
//     console.log('RateLimit:', rateLimit);
//     console.log(`----------------------------------------------------------------------------------------------------------------`);
// });

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

client.on('guildUpdate', async (old_guild, new_guild) => {
    if (new_guild.partial) await new_guild.fetch();
    if (new_guild.available) {
        updateGuildConfig(new_guild);
    }
});

// client.on('guildUnavailable', (guild) => {
//     console.info(`----------------------------------------------------------------------------------------------------------------`);
//     console.info(`Guild: (${guild?.id}) is unavailable!`);
//     console.info(`----------------------------------------------------------------------------------------------------------------`);
// });

client.on('invalidated', () => {
    console.warn(`----------------------------------------------------------------------------------------------------------------`);
    console.warn(`Bot session was invalidated!`);
    console.warn(`----------------------------------------------------------------------------------------------------------------`);
    process.exit(1);
});

client.on('ready', async () => {
    const ready_timestamp = moment();
    console.log(`----------------------------------------------------------------------------------------------------------------`);
    console.log(`${bot_common_name} Logged in as ${client.user.tag} on ${ready_timestamp} in ${client.guilds.cache.size} servers!`);
    console.log(`${client.guilds.cache.map(guild => `(${guild.id}) ${guild.name}`).join('\n')}`);
    console.log(`----------------------------------------------------------------------------------------------------------------`);
    
    client.user.setPresence({type:4, activity:{name:`Just restarted!`}});
    client.channels.cache.filter(channel => channel.name === bot_restart_log_channel_name).forEach(channel => {
        if (channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
            channel.send(`${bot_common_name} restarted! ${ready_timestamp}`);
        } else {
            console.warn(`Unable to send restart message to ${channel.name} (${channel.id}) > ${channel.guild.name} (${channel.guild.id})`)
        }
    });

    let presenceMode = 'mention'; // can be [ mention | uptime | creator | mention_me | version | guilds | users ]
    client.setTimeout(() => {// wait after a restart before updating the presence
        client.setInterval(() => {
            if (presenceMode === 'mention') {
                client.user.setPresence({type:4, activity:{name:`@${client.user.tag}`}});
                presenceMode = 'uptime';
            } else if (presenceMode === 'uptime') {
                client.user.setPresence({type:4, activity:{name:`Uptime: ${getReadableTime(client.uptime / 1000)}`}});
                presenceMode = 'creator';
            } else if (presenceMode === 'creator') {
                client.user.setPresence({type:4, activity:{name:`👨‍💻${client.users.cache.get(bot_owner_discord_id).tag}👑`}});
                presenceMode = 'mention_me';
            } else if (presenceMode === 'mention_me') {
                client.user.setPresence({type:4, activity:{name:`@mention me for help!`}});
                presenceMode = 'version';
            } else if (presenceMode === 'version') {
                client.user.setPresence({type:4, activity:{name:`${bot_version}`}});
                presenceMode = 'guilds';
            } else if (presenceMode === 'guilds') {
                client.user.setPresence({type:4, activity:{name:`in ${client.guilds.cache.size} servers!`}});
                presenceMode = 'users';
            } else if (presenceMode === 'users') {
                client.user.setPresence({type:4, activity:{name:`with ${client.users.cache.filter(user => !user.bot).size} people!`}});
                presenceMode = 'mention';
            }
        }, 1000 * 10); // 10 seconds
    }, 1000 * 60 * 1); // 1 minute

    //#region Update Guild Configs To Include Their State Of Existence After Each Restart
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
    //#endregion

    client.guilds.cache.forEach(async guild => {
        if (!guild) return;
        if (checkForBlacklistedGuild(guild)) return;
        updateGuildConfig(guild);
        addServerToServers(guild);
    });

    client.setInterval(() => {// Update each guild config after an interval of 5 minutes
        client.guilds.cache.forEach(guild => updateGuildConfig(guild));
    }, 1000 * 60 * 5);
});



client.on('guildCreate', async guild => {
    if (!guild.available) return;
    if (guild.partial) guild.fetch();
    client.channels.cache.get(bot_central_guild_history_channel_id)?.send(new CustomRichEmbed({
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
            `I function most optimally with **ADMINISTRATOR** permissions given to me, however this is not required!`,
            `There are **special channels** that I can provide to you, use \`${bot_default_guild_config.command_prefix}create_special_channels\` to create them!`,
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
    addServerToServers(guild);
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

client.on('channelCreate', async channel => {
    if (channel) channel.fetch();
    if (channel.type !== 'text') return;
    const gcm = new GuildConfigManipulator(channel.guild.id);
    const guild_config = gcm.config;
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
                description:`Now syncing future \`${command_prefix}ban\` command appeal messages to this channel!\n`
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
                description:`Any reactions added to messages sent before a restart of ${bot_common_name} cannot be logged!\nAny reactions added by bots cannot be logged!`
            }));
        break;
    }
});


client.on('guildMemberAdd', async member => {
    if (member.partial) member.fetch();
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
    if (member.partial) member.fetch();
    if (isThisBot(member.id)) return; // Don't log the bot itself joining... It can happen oddly enough...
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

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    
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
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
    
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

client.on('inviteCreate', async invite => {
    if (!invite.channel.guild) return;
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
    if (!invite.channel.guild) return;
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

//#region Appeals Centre
client.on('guildMemberAdd', async member => {
    if (member.partial) await member.fetch();
    if (member.guild.id !== bot_appeals_guild_id) return; // Check to see if the joined the Bot Appeals Guild

    for (let guild of client.guilds.cache.values()) {
        await util.Timer(250); // Prevent Discord API Abuse
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
//#endregion Appeals Centre

//---------------------------------------------------------------------------------------------------------------//

//#region Automatic Roles
client.on('guildMemberAdd', async member => {
    if (member.partial) await member.fetch();
    const guild = member.guild;
    const auto_roles = new GuildConfigManipulator(guild.id).config.new_member_roles ?? [];
    if (auto_roles.length > 0 && guild.me.hasPermission('MANAGE_ROLES')) {
        await util.Timer(1000); // Prevent API Abuse
        member.roles.add(auto_roles, 'Adding Auto Roles');
    }
});
//#endregion Automatic Roles

//---------------------------------------------------------------------------------------------------------------//

client.on('message', async message => {
    if (!message) return;
    if (message.partial) await message.fetch();
    if (message.guild) await message.guild.fetch();

    if (message.content.trim() === '' && message.cleanContent.trim() === '') return; // Don't allow empty messages
    if (checkForBots(message)) return;
    if (util.lockdown_mode && !isThisBotsOwner(message.author.id)) return;
    
    /* Handle DMs */
    if (!checkForBots(message) && message.channel.type === 'text' && message.channel.parentID === process.env.CENTRAL_DM_CHANNELS_CATEGORY_ID) {
        const dmUser = client.users.cache.get(`${message.channel.name.replace('dm-', '')}`);
        if (dmUser) {
            const dmEmbed = new CustomRichEmbed({
                author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                description:`${message.cleanContent}`,
                fields:(message.attachments.size > 0 ? message.attachments.map(attachment => ({name:`'${attachment.name}' [${attachment.size} Bytes] (${attachment.id})`, value:attachment.url})) : null),
                footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`Support Staff: ${moment()}`}
            });
            await message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
            try {
                const dmChannel = await dmUser.createDM();
                await dmChannel.send(dmEmbed);
                await message.channel.send(dmEmbed);
            } catch {
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:'Unable to send messages to this user!'
                }));
            }
        }
    }
    if (message.channel.type === 'dm') {
        if (checkForBlacklistedUser(message)) return;
        if (message.content === '%help') {
            message.channel.send(`That command can't be used here... Use it in a server's text-channel.`);
            return;
        }
        const dmEmbed = new CustomRichEmbed({
            color:0xBBBBBB,
            author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
            description:`${message.cleanContent}`,
            fields:(message.attachments.size > 0 ? message.attachments.map(attachment => ({name:`'${attachment.name}' [${attachment.size} Bytes] (${attachment.id})`, value:attachment.url})) : null),
            footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`Direct Message: ${moment()}`}
        });
        const potentialCentralDMChannel = client.guilds.cache.get(bot_logging_guild_id).channels.cache.find(channel => channel.name === `dm-${message.author.id}`);
        if (potentialCentralDMChannel) {
            potentialCentralDMChannel.send(dmEmbed);
        } else {
            await message.channel.send(new CustomRichEmbed({
                title:`Opening Chat With ${bot_common_name} Staff`,
                description:`My staff will answer any questions as soon as they see it!\n\nRemember that you can request for your history to be deleted at any time!`
            }));
            const central_dm_channel_with_user = client.guilds.cache.get(bot_logging_guild_id).channels.create(`dm-${message.author.id}`, {type:'text', topic:`${message.author.tag} (${message.author.id}) | ${moment()}`});
            await central_dm_channel_with_user.setParent(process.env.CENTRAL_DM_CHANNELS_CATEGORY_ID);
            await central_dm_channel_with_user.lockPermissions();
            await central_dm_channel_with_user.send(new CustomRichEmbed({
                title:`Opened DM with: ${message.author.tag} (${message.author.id})`
            }));
            await central_dm_channel_with_user.send(dmEmbed);
        }
    }

    /** The Bot is being used in a guild from here on out */
    if (message.channel.type !== 'text') return; // Make sure that the message is from a guild text-channel
    if (servers[message.guild.id]?.lockdown_mode && !isThisBotsOwner(message.author.id)) return; // Handle Guild Lockdown

    if (checkForUserInGuildTimeout(message)) return;

    /* Register Command Prefix */
    const guild_config_manipulator = new GuildConfigManipulator(message.guild.id);
    const guild_config = new GuildConfigManipulator(message.guild.id).config;
    const cp = guild_config.command_prefix || bot_default_guild_config.command_prefix;

    /* Handle guild messages that start with a mention of the bot */
    if (message.content.startsWith(`<@!${client.user.id}>`)) {
        const quick_help_embed = new CustomRichEmbed({
            title:`Hi there ${message.author.username}`,
            description:`My command prefix is \`${cp}\` in the server **${message.guild.name}**.\n\nUse \`${cp}help\` in that server to get started!`
        });
        message.channel.send(quick_help_embed);
        message.author.createDM().then(dmChannel => {
            dmChannel.send(quick_help_embed);
        }).catch(error => logUserError(message, error));
        return;
    }

    //#region Public Commands
    const helpCommands = [
        `${cp}help`,
        `${cp}all_commands`,
        // `${cp}about_command`,
    ];
    const botinfoCommands = [
        `${cp}info`,
        `${cp}invite`,
        `${cp}invite_developer`,
        `${cp}support_discord`,
        `${cp}feedback`,
        `${cp}disclaimer`,
        `${cp}request_history_deletion`
    ];
    const youtubeCommands = [
        `${cp}`, `${cp}play`, `${cp}p`,
        `${cp}playnext`, `${cp}pn`,
        `${cp}search`
    ];
    const musicControlCommands = [
        `${cp}controls`, `${cp}c`,
        `${cp}volume`, `${cp}v`,
        `${cp}summon`,
        `${cp}pause`,
        `${cp}resume`,
        `${cp}skip`, `${cp}s`, `${cp}next`, `${cp}n`,
        `${cp}replay`, `${cp}r`,
        `${cp}queue`, `${cp}q`,
        `${cp}nowplaying`, `${cp}np`,
        `${cp}timestamp`, `${cp}ts`
    ];
    const disconnectCommands = [
        `${cp}${cp}`, `${cp}stop`, `${cp}bye`, `${cp}fuckoff`
    ];
    const funCommands = [
        `${cp}poll`,
        `${cp}roast`,
        `${cp}tictactoe`,
        `${cp}akinator`,
        `${cp}cards`,
        `${cp}magic8ball`,
        `${cp}newyearsball`,
        `${cp}rolldice`,
        `${cp}dogeify`,
        `${cp}spongebobmock`,
        `${cp}google`,
        `${cp}reddit`
        // `${cp}d2memes`,
    ];
    const utilityCommands = [
        `${cp}embed`,
        `${cp}remindme`,
        `${cp}math`,
        `${cp}serverinfo`,
        `${cp}channelinfo`,
        `${cp}memberinfo`,
        `${cp}roleinfo`,
        `${cp}ipinfo`,
        `${cp}tts`,
        `${cp}googletranslate`,
        `${cp}langcodes`,
        `${cp}detectlang`
    ];
    const adminCommands = [
        `${cp}clear`, `${cp}purge`,
        `${cp}wipeout`,
        `${cp}archive`,
        `${cp}afk`,
        `${cp}move`,
        `${cp}yoink`,
        `${cp}warn`,
        `${cp}warnings`,
        `${cp}mute`,
        `${cp}deafen`,
        `${cp}flextape`,
        `${cp}giverole`,
        `${cp}takerole`,
        `${cp}timeout`,
        `${cp}disconnect`,
        `${cp}kick`,
        `${cp}ban`,
        `${cp}unban`,
        `${cp}bans`
    ];
    const serverSettingsCommands = [
        `${cp}create_special_channels`,
        `${cp}toggle_command_message_removal`,
        `${cp}toggle_clear_message`,
        `${cp}toggle_player_description`,
        `${cp}toggle_invite_blocking`,
        `${cp}toggle_url_blocking`,
        `${cp}set_volume_maximum`,
        `${cp}set_volume_multiplier`,
        `${cp}set_ibm_tts_language`,
        `${cp}set_google_tts_language`,
        `${cp}set_moderator_roles`,
        `${cp}set_admin_roles`,
        `${cp}set_new_member_roles`,
        `${cp}set_allowed_channels`,
        `${cp}set_prefix`
    ];
    const structuredCommandList = {
        'Help Commands':helpCommands,
        'Bot Info':botinfoCommands,
        'YouTube Music And More':youtubeCommands,
        'Music Controls':musicControlCommands,
        'Disconnect':disconnectCommands,
        'Fun Stuff':funCommands,
        'Utilities':utilityCommands,
        'Administrative Powers':adminCommands,
        'Server Management':serverSettingsCommands
    };
    //#endregion

    //#region Unlisted Command Categories
    const d2MemeCommands = [
        `${cp}shaxx`,
        `${cp}failsafe`,
        `${cp}caydesix`,
        `${cp}rasputin`,
        `${cp}ghost`,
        `${cp}zavala`
    ];
    //#endregion

    //#region Private Commands
    const botAdminCommands = [
        `${cp}supercommands`,
        `${cp}superpeople`,
        `${cp}superpermissions`,
        `${cp}eval`,
        `${cp}supervolume`, `${cp}sv`,
        `${cp}echo`,
        `${cp}dm`,
        `${cp}deletemessage`,
        `${cp}getguilds`,
        `${cp}getguild`,
        `${cp}blacklist`,
        `${cp}restart`
    ];
    const botOwnerCommands = [
        `${cp}updatelog`,
        `${cp}lockdown`,
        `${cp}leaveguild`
    ];
    //#endregion

    //#startregion
    const command_descriptions = {
        'help':`Shows commands in ${bot_common_name} one category at a time.`,
        'all_commands':`Shows all commands in ${bot_common_name} at once.`,
        // 'about_command':`Shows a description for each command.`,
        'invite':`Generates an invite for ${bot_common_name}.`,
        'invite_developer':`Generates an invite for ${bot_common_name}'s developer to assist any user that requests it.`,
        'info':`Shows information about ${bot_common_name}.`,
        'support_discord':`Generates a server invite for ${bot_common_name}'s Support Server.`,
        'feedback':`Sends feedback to ${bot_common_name}'s Support Server.`,
        'disclaimer':`Legal disclaimer for ${bot_common_name}.`,
        'request_history_deletion':`Requests for your history to be deleted from ${bot_common_name}.`,
        [`${cp}`]:`Plays music from youtube and other sources.`,
        'play':`Plays music from youtube and other sources.`,
        'p':`Plays music from youtube and other sources.`,
        'playnext':`Plays music from youtube and other sources next in the queue.`,
        'pn':`Plays music from youtube and other sources next in the queue.`,
        'search':`Searched for music from youtube and lets you choose what to play.`,
        'controls':`Displays audio controls for ${bot_common_name}.`,
        'c':`Displays audio controls for ${bot_common_name}.`,
        'volume':`Displays volume controls for ${bot_common_name}.`,
        'v':`Displays volume controls for ${bot_common_name}.`,
        'summon':`Connects ${bot_common_name} to your voice channel.`,
        'pause':`Pauses current song.`,
        'resume':`Resumes current song.`,
        'skip':`Skips current song in queue.`,
        's':`Skips current song in queue.`,
        'replay':`Adds the last played song to the queue.`,
        'queue':`Shows queue controls.`,
        'q':`Shows queue controls`,
        'nowplaying':`Shows what is currently playing.`,
        'np':`Shows what is currently playing.`,
        'timestamp':`Shows how much time has elapsed in current song.`,
        'ts':`Shows how much time has elapsed in current song.`,
        [`${cp}${cp}`]:`Disconnects the bot from the voice channel.`,
        'bye':`Disconnects the bot from the voice channel.`,
        'stop':`Disconnects the bot from the voice channel.`,
        'fuckoff':`Disconnects the bot from the voice channel.`,
        'roast':`Roasts the specified user.`,
        'tictactoe':`Starts a game of tic-tac-toe that you can play with a friend.`,
        'akinator':`Starts a game of akinator`,
        'cards':`Generates a random Cards Against Humanity response.`,
        'dogeify':`wow such command. uwu very much doge!`,
        'spongebobmock':`ArE You mOcKinG Me!`,
        'magic8ball':`Read the command name slowly if you don't get it.`,
        'newyearsball':`Try it out to find out.`,
        'google':`Grabs some search results from Google.`,
        'reddit':`Grabs some posts from a specified subreddit.`,
        'rolldice':`Allows you to roll dice.`,
        'poll':`Allows you to create a poll with reactions for answers.`,
        'embed':`Allows you to send embed messages via ${bot_common_name}.`,
        'remindme':`Sets a reminder for a specified time and DMs you the reminder.`,
        'math':`Evaluates math like a good little calculator would!`,
        'serverinfo':`Information about the server you are in.`,
        'channelinfo':`Information about the channel you are interested in or the text-channel you are in.`,
        'memberinfo':`Information about the user you are interested in or yourself.`,
        'roleinfo':`Information about the role you are interested in.`,
        'ipinfo':`Extremely public information about the IP provided.`,
        'tts':`Speaks in the voice channel you are in via IBM or Google Text-To-Speech.`,
        'googletranslate':`Google translate in ${bot_common_name}.`,
        'langcodes':`Displays language codes that can be used with tts and googletranslate.`,
        'detectlang':`Detects the languge of the message.`,
        'clear':`Clears out a specified number of messages in a channel.`,
        'purge':`Clears out a specified number of messages in a channel.`,
        'wipeout':`Clones the channel and its perms and then deletes the original.`,
        'archive':`Archives the channel and its messages, preventing non-staff from viewing it.`,
        'afk':`Move specified user to server afk channel.`,
        'move':`Move specified user to specified voice channel.`,
        'yoink':`Move specified user to your voice channel.`,
        'warn':`Warns a specified user via the text channel the command was used in and via DMs.`,
        'warnings':`Displays a list of users that have been warned and what they were warned for.`,
        'mute':`Mutes / unmutes a specified user.`,
        'deafen':`Deafen / undeafens a specified user.`,
        'flextape':`Mutes & deafens / unmutes & undeafens a specified user.`,
        'giverole':`Gives specified role to specified user.`,
        'takerole':`Removes specified role from specified user.`,
        'timeout':`Puts specified user into timeout in that server. All messages sent by that user will be immediately deleted after they are sent.`,
        'disconnect':`Disconnects specified user from their voice channel.`,
        'kick':`Kicks the user from the server and DMs them a message explaining why they were kicked.`,
        'ban':`Bans the user from the server and DMs them a message explaining why they were banned.`,
        'unban':`Unbans the user from the server.`,
        'bans':`Retrieves a list of banned members.`,
        'create_special_channels':`Creates special logging channels used by ${bot_common_name}.`,
        'toggle_command_message_removal':`Toggles deleting user command messages.`,
        'toggle_clear_message':`Toggles the message that is sent after the clear command is used.`,
        'toggle_player_description':`Toggles the default youtube player's description expansion state when sent.`,
        'toggle_invite_blocking':`Toggles ${bot_common_name} invite blocking behavior thus preventing discord invites sent by members in the server.`,
        'toggle_url_blocking':`Toggles ${bot_common_name} url blocking behavior thus preventing urls sent by members in the server.`,
        'set_volume_maximum':`Sets a server-wide maximum volume for all audio played through ${bot_common_name}.`,
        'set_volume_multiplier':`Sets a server-wide volume multiplier for all audio played through ${bot_common_name}.`,
        'set_ibm_tts_language':`Sets the default IBM TTS Voice for ${bot_common_name} in your server.`,
        'set_google_tts_language':`Sets the default Google TTS Voice for ${bot_common_name} in your server.`,
        'set_moderator_roles':`Sets roles that should be considered as a Moderator by ${bot_common_name}.`,
        'set_admin_roles':`Sets roles that should be considered as an Admin by ${bot_common_name}.`,
        'set_new_member_roles':`Sets roles that should be automatically added to new members by ${bot_common_name}.`,
        'set_allowed_channels':`Locks ${bot_common_name} to only function in specified channels.`,
        'set_prefix':`Changes the command prefix used before each command in your server.`
    };
    //#endregion


    /** @TODO */
    //#region guild invite blocking
    const guild_invite_blocking_enabled = guild_config.invite_blocking === 'enabled';
    const contains_invite_link = message.cleanContent.includes(`discord.gg/`) || message.cleanContent.includes('discord.com/invite/') || message.cleanContent.includes(`discord.io/`) || message.cleanContent.includes(`invite.gg/`);
    if (guild_invite_blocking_enabled && contains_invite_link) {
        if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            if (message.member.hasPermission('ADMINISTRATOR')) {
                message.channel.send(new CustomRichEmbed({
                    color:0x00FF00,
                    author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                    title:'Woah there!',
                    description:'Sending discord invites is not allowed in this guild, but you are immune!'
                }));
            } else {
                await message.delete({timeout:250}).catch(error => console.warn(`Unable to delete message`, error));
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                    title:'Woah there!',
                    description:'Sending discord invites is not allowed in this guild!'
                }));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFF0000,
                title:'An error has occurred!',
                description:`This guild has invite blocking enabled, but I do not have the permission \`MANAGE_MESSAGES\` to delete messages with discord invites.`
            }));
        }
    }
    //#endregion guild invite blocking

    //#region guild url blocking
    const guild_url_blocking_enabled = guild_config.url_blocking === 'enabled';
    const contains_url = new RegExp('([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?').test(message.cleanContent);
    if (guild_url_blocking_enabled && contains_url) {
        if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
            if (message.member.hasPermission('ADMINISTRATOR')) {
                message.channel.send(new CustomRichEmbed({
                    color:0x00FF00,
                    author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                    title:'Woah there!',
                    description:'Sending links is not allowed in this guild, but you are immune!'
                }));
            } else {
                await message.delete({timeout:250}).catch(error => console.warn(`Unable to delete message`, error));
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    author:{iconURL:message.author.displayAvatarURL({dynamic:true}), name:`@${message.author.tag} (${message.author.id})`},
                    title:'Woah there!',
                    description:'Sending links is not allowed in this guild!'
                }));
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color:0xFF0000,
                title:'An error has occurred!',
                description:`This guild has url blocking enabled, but I do not have the permission \`MANAGE_MESSAGES\` to delete messages with urls.`
            }));
        }
    }
    //#endregion guild url blocking

    //#region setup important constants
    if (!message.content.startsWith(cp)) return;
    if (util.restarting_bot) {
        message.channel.send(new CustomRichEmbed({
            color:0xFF00FF,
            title:`You currently can't use ${bot_common_name}!`,
            description:`${bot_common_name} is restarting for updates right now!\nCheck back in 5 minutes to see if the updates are done.`
        }, message));
        return;
    }
    const command_timestamp = moment();
    const discord_command = getDiscordCommand(message.content);
    const command_args =  getDiscordCommandArgs(message.content);
    const clean_command_args = getDiscordCleanCommandArgs(message.cleanContent);
    const discord_command_without_prefix = discord_command.replace(`${cp}`, '');
    if (discord_command_without_prefix.match(/^\d/)) return; // Don't allow commands that start with numbers (aka $50 is not a command)
    //#endregion setup important constants
    
    //#region check for guild allowed channels
    const guild_config_allowed_channels = new GuildConfigManipulator(message.guild.id).config.allowed_channels;
    const fetched_allowed_channels = await Promise.all(guild_config_allowed_channels.map(async channel_id => await message.guild.channels.resolve(channel_id)?.fetch()));
    const is_not_backup_commands_channel = message.channel.name !== bot_backup_commands_channel_name;
    const is_guild_allowed_channel = guild_config_allowed_channels.includes(message.channel.id);
    if (guild_config_allowed_channels.length > 0 && is_not_backup_commands_channel && !is_guild_allowed_channel && !message.member.hasPermission('ADMINISTRATOR')) {
        const dmChannel = await message.author.createDM();
        dmChannel.send(new CustomRichEmbed({
            title:`Sorry you aren't allowed to use ${bot_common_name} commands in that channel`,
            description:`The server you tried using me in has setup special channels for me to be used in.`,
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
    //#endregion

    if (checkForBlacklistedUser(message)) return;
    if (checkForBlacklistedGuild(message.guild)) return;
    if (checkForUserInGuildTimeout(message)) return;

    /* Respond accordingly depending on whether or not the message can be deleted and the server wants it to be deleted */
    if (message.deletable && message.attachments.size === 0 && guild_config.command_message_removal === 'enabled') {
        let old_message = message;
        try {
            message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
        } catch (error) {
            logUserError(message, `Unable to delete the user's command message!\nThere is most likely another bot colliding with the command prefix **${cp}**!`);
        } finally {
            handleCommands(old_message);
        }
    } else {// Continue without deleting the message
        handleCommands(message);
    }

    async function handleCommands(old_message) {
        //#region central command logging
        try {
            const current_command_log_file_name = bot_command_log_file.replace('#{date}', `${moment().format(`YYYY_MM`)}`);
            const command_log_file_exists = fs.existsSync(current_command_log_file_name);
            const current_command_logs = command_log_file_exists ? JSON.parse(fs.readFileSync(current_command_log_file_name)) : {};
            const command_log_entry = {
                guild:`[${old_message.guild.name}] (${old_message.guild.id})`,
                user:`[@${old_message.author.tag}] (${old_message.author.id})`,
                channel:`[#${old_message.channel.name}] (${old_message.channel.id})`,
                timestamp:`${command_timestamp}`,
                command:`${old_message.content}`
            };
            console.info({command_log_entry});
            const updated_command_log = [...current_command_logs, command_log_entry];
            fs.writeFileSync(current_command_log_file_name, JSON.stringify(updated_command_log, null, 2), {flag:'w'});
        } catch (error) {
            console.trace(`Unable to save to command log file!`, error);
        }
        //#endregion central command logging
        
        //#region central anonymous command logging
        const anonymous_command_log_entry = {
            timestamp:`${command_timestamp}`,
            command:`${old_message.content}`
        };
        client.channels.cache.get(bot_central_command_log_channel_id)?.send(`${'```'}json\n${JSON.stringify(anonymous_command_log_entry, null, 2)}\n${'```'}`);
        //#endregion central anonymous command logging

        //#region guild command logging
        old_message.guild.channels.cache.filter(channel => channel.name === bot_command_log_channel_name).forEach(channel => {
            channel.send(new CustomRichEmbed({
                author:{iconURL:old_message.author.displayAvatarURL({dynamic:true}), name:`@${old_message.author.tag} (${old_message.author.id})`},
                title:'Command Used',
                description:`${'```'}\n${old_message.content}\n${'```'}`,
                footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${command_timestamp}`}
            }));
        });
        //#endregion guild command logging

        if (helpCommands.includes(discord_command)) {
            if ([`${cp}help`].includes(discord_command)) {
                const help_pages = Object.entries(structuredCommandList);
                const help_pages_names = help_pages.map(help_page => `${Object.keys(Object.fromEntries(help_pages)).indexOf(help_page[0]) + 1} — ${help_page[0]}`).join('\n');
                const page_numbers_as_words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                let page_index = parseInt(command_args[0])-1 || 0; // Do not use ??
                
                function makeHelpEmbed() {
                    const page_emoji = util.findCustomEmoji(`bot_emoji_${page_numbers_as_words[page_index]}`);
                    return new CustomRichEmbed({
                        title:`Hi! I'm here to help! Let's start by navigating the help menu's pages!`,
                        fields:[
                            {name:`Help Pages`, value:`${'```'}\n${help_pages_names}${'```'}`},
                            {name:'\u200b', value:'\u200b'},
                            {name:`${page_emoji} — ${help_pages[page_index][0]}`, value:`${'```'}\n${help_pages[page_index][1].join('\n')}\n${'```'}`},
                            ...(!old_message.guild.me.hasPermission('MANAGE_MESSAGES') ? [
                                {name:'\u200b', value:'\u200b'},
                                {name:`Help Menu Navigation`, value:`Use the following to navigate the help menu!${'```'}\n${discord_command} PAGE_NUMBER_HERE\n${'```'}`}
                            ] : [])
                        ]
                    }, old_message);
                }
                if (old_message.guild.me.hasPermission('MANAGE_MESSAGES')) {
                    sendOptionsMessage(old_message.channel.id, makeHelpEmbed(), [
                        {
                            emoji_name:'bot_emoji_angle_left', //'arrow_left',
                            callback:(options_message, collected_reaction, user) => {
                                removeUserReactionsFromMessage(options_message);
                                page_index--;
                                if (page_index < 0) {page_index = help_pages.length-1;}
                                options_message.edit(makeHelpEmbed());
                            }
                        }, ...[
                            {emoji_name:'bot_emoji_one', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 0; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_two', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 1; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_three', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 2; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_four', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 3; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_five', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 4; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_six', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 5; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_seven', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 6; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_eight', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 7; options_message.edit(makeHelpEmbed());}},
                            {emoji_name:'bot_emoji_nine', callback:(options_message, collected_reaction, user) => {removeUserReactionsFromMessage(options_message); page_index = 8; options_message.edit(makeHelpEmbed());}},
                        ], {
                            emoji_name:'bot_emoji_angle_right', //'arrow_right',
                            callback:(options_message, collected_reaction, user) => {
                                removeUserReactionsFromMessage(options_message);
                                page_index++;
                                if (page_index > help_pages.length-1) {page_index = 0;}
                                options_message.edit(makeHelpEmbed());
                            }
                        }
                    ]);
                } else {
                    old_message.channel.send(makeHelpEmbed());
                }
            } else if ([`${cp}all_commands`].includes(discord_command)) {
                old_message.channel.send(new CustomRichEmbed({
                    title:`Here are the possible commands all at once!`,
                    fields:Object.keys(structuredCommandList).map(key => ({name:key, value:`${'```'}\n${structuredCommandList[key].join('\n')}${'```'}`}))
                }, old_message));
            }
            /** @TODO make new command help system */
            // else if ([`${cp}about_command`].includes(discord_command)) {
            //     const command_to_lookup = command_args[0];
            //     if (command_to_lookup) {
            //         const command_description_found = command_descriptions[command_to_lookup];
            //         if (command_description_found) {
            //             old_message.channel.send(new CustomRichEmbed({
            //                 title:`About Command: ${command_to_lookup}`,
            //                 description:`\`\`\`${command_description_found}\`\`\``
            //             }, old_message));
            //         } else {
            //             old_message.channel.send(new CustomRichEmbed({
            //                 color:0xFFFF00,
            //                 title:'Whoops!',
            //                 description:`Either that command doesn't have a description, or that isn't a command!`
            //             }, old_message));
            //         }
            //     } else {
            //         old_message.channel.send(new CustomRichEmbed({
            //             title:'About Command',
            //             description:'This command can display a quick description of any command.',
            //             fields:[
            //                 {name:'Command Usage', value:`\`\`\`${discord_command} COMMAND_NAME_HERE\`\`\``},
            //                 {name:'Example', value:`\`\`\`${discord_command} play\`\`\``}
            //             ]
            //         }, old_message));
            //     }
            // }
        } else if (botinfoCommands.includes(discord_command)) {
            if ([`${cp}invite`].includes(discord_command)) {
                old_message.channel.send(new CustomRichEmbed({
                    title:`Hi ${old_message.author.username}!`,
                    description:`If you want to invite me to your server, then click below:\n[Add ${bot_common_name} to discord server](${bot_invite_link})`
                }, old_message));
            } else if ([`${cp}invite_developer`].includes(discord_command)) {
                const confirmEmbed = new CustomRichEmbed({
                    title:`Are you sure you want to summon my developer ${fetch_bot_owner_tag()}?`,
                    description:`\`\`\`fix\nWarning: Check with your server's staff to see if you are allowed to do this!\n\`\`\``
                }, old_message);
                sendOptionsMessage(old_message.channel.id, confirmEmbed, [{
                    emoji_name:'white_check_mark',
                    callback:async (options_message, collected_reaction, user) => {
                        const guild_invite = await message.channel.createInvite({maxUses:1});
                        const guild_invite_url = guild_invite.url;
                        const guild_invite_channel = guild_invite.channel;
                        const guild_invite_guild = guild_invite_channel.guild;
                        if (guild_invite) {
                            const bot_owner = await client.users.fetch(bot_owner_discord_id);
                            const bot_owner_dms = await bot_owner.createDM();
                            bot_owner_dms.send(new CustomRichEmbed({
                                title:`You have been summoned by @${old_message.author.tag} (${old_message.author.id})`,
                                description:`${guild_invite_guild.name || null} > ${guild_invite_channel.name || null} <${guild_invite_url}>`
                            }));
                            options_message.edit(new CustomRichEmbed({
                                title:`My developer (${fetch_bot_owner_tag()}) was invited to this server by @${old_message.author.tag}!`
                            }, old_message));
                        } else {
                            options_message.edit(new CustomRichEmbed({
                                title:`Failed to Invite My Developer (${fetch_bot_owner_tag()})!`
                            }, old_message));
                        }
                    }
                }, {
                    emoji_name:'x',
                    callback:(rich_embed) => {
                        rich_embed.edit(new CustomRichEmbed({title:'Canceled'}, old_message));
                    }
                }], old_message.author.id);
            } else if ([`${cp}info`].includes(discord_command)) {
                const bot_emoji = util.findCustomEmoji('bot_emoji_bot');
                const midspike_emoji = util.findCustomEmoji('bot_emoji_midspike');
                const music_listeners = client.voice.connections.map(connection => connection.channel.members.filter(member => !member.user.bot).size).reduce((a, b) => a + b, 0) ?? 0;
                old_message.channel.send(new CustomRichEmbed({
                    title:`Hi There!`,
                    description:`I'm **${bot_common_name}**, the *${bot_long_name}*, a general purpose music & utility discord bot that is here to help.`,
                    fields:[
                        {name:'Me', value:`${bot_emoji} @${client.user.tag}`},
                        {name:'My Developer', value:`${midspike_emoji} ${fetch_bot_owner_tag()}`},
                        {name:'My Admins', value:`${super_people.filter(super_person => super_person.public).map(super_person => super_person.name).join('\n')}`},
                        {name:'My Website', value:`${bot_website}`},
                        {name:'My Version', value:`${bot_version}`},
                        {name:'My Ping To Discord', value:`${client.ws.ping}ms`},
                        {name:'My Creation Date', value:`${client.user.createdAt}`},
                        {name:'My Uptime', value:`${getReadableTime(client.uptime / 1000)} (hours : minutes : seconds)`},
                        {name:`The Number Of People Listening To Music`, value:`${music_listeners} ${music_listeners === 1 ? 'person is' : 'people are'} listening to music`},
                        {name:`The Number Of People I Know`, value:`${client.users.cache.filter(user => !user.bot).size} People`},
                        {name:`The Number Of Guilds I'm In`, value:`${client.guilds.cache.size} Guilds`},
                        {name:'The Special Channels Usage', value:`${bot_special_text_channels.map(bot_channel => `\`${bot_channel}\` - ${client.channels.cache.filter(channel => channel.name === bot_channel).size || 0} Guilds`).join('\n')}`},
                        {name:'The Legal Disclaimer', value:`Use \`${cp}disclaimer\` for information regarding your privacy and safety.`},
                    ]
                }, old_message));
            } else if ([`${cp}support_discord`].includes(discord_command)) {
                const support_guild = client.guilds.cache.get(bot_support_guild_id);
                const support_guild_invite = await support_guild.channels.cache.first().createInvite({
                    unique:true,
                    maxAge:60 * 60 * 24, // 24 hours in seconds
                    reason:`@${old_message.author.tag} (${old_message.author.id}) used ${discord_command} in ${old_message.guild.name} ${old_message.guild.id}`
                });
                old_message.channel.send(new CustomRichEmbed({
                    title:`Hey ${old_message.author.username}, You can speak with some people involved with the bot here!`,
                    description:`Click to join the [${support_guild.name} Discord](${support_guild_invite.url})!`
                }, old_message));
            } else if ([`${cp}feedback`].includes(discord_command)) {
                if (command_args.join('').length > 1) {// See if they left some feedback
                    client.channels.cache.get(bot_central_feedback_channel_id).send(new CustomRichEmbed({
                        author:{iconURL:old_message.author.displayAvatarURL({dynamic:true}), name:`@${old_message.author.tag} (${old_message.author.id})`},
                        description:`${'```'}\n${command_args.join(' ')}${'```'}`
                    })).then(async () => {
                        const support_guild = client.guilds.cache.get(bot_support_guild_id);
                        const support_guild_invite = await support_guild.channels.cache.first().createInvite({
                            unique:true,
                            maxAge:60 * 60 * 24, // 24 hours
                            reason:`@${old_message.author.tag} (${old_message.author.id}) used ${discord_command} in ${old_message.guild.name} ${old_message.guild.id}`
                        });
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Thanks for the feedback!`,
                            description:`Your message was sent to the [${support_guild.name} Discord](${support_guild_invite.url})!`
                        }, old_message));
                    });
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`This is a feedback command!`,
                        description:`Please leave a message with some feedback after \`${discord_command}\`. Exanple: ${'```'}\n${discord_command} wow this is a cool bot!\n${'```'}`
                    }, old_message));
                }
            } else if ([`${cp}disclaimer`].includes(discord_command)) {
                const legal_usage_disclaimer_file = './files/disclaimer.txt';
                const legal_disclaimer = fs.readFileSync(legal_usage_disclaimer_file).toString();
                const legal_disclaimer_chunks = legal_disclaimer.split('\r\n\r\n');

                if (command_args[0] === 'no_attachments') {
                    legal_disclaimer_chunks.forEach((legal_disclaimer_chunk, index) => {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`${bot_common_name} Legal Disclaimer Inbound! (Part ${index+1}/${legal_disclaimer_chunks.length})`,
                            description:`${'```'}\n${legal_disclaimer_chunk}\n${'```'}`
                        }, old_message));
                    });
                } else {
                    const attachment = new Discord.MessageAttachment(legal_usage_disclaimer_file);
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Legal Disclaimer Inbound!',
                        description:`You can also do \`${discord_command} no_attachments\` to see the disclaimer without downloading it!`,
                        image:`${bot_cdn_url}/law-and-justice.jpg`
                    }, old_message)).then(() => {
                        old_message.channel.send({files:[attachment]});
                    });
                }
            } else if ([`${cp}request_history_deletion`].includes(discord_command)) {
                client.channels.cache.get(bot_central_history_deletion_requests_channel_id).send(`@${old_message.author.tag} (${old_message.author.id}) Requested to have their history deleted!`).then(() => {
                    old_message.reply(new CustomRichEmbed({
                        title:'Success! Your command history will be deleted within 24 hours!',
                        description:`Keep in mind that essential data such as ban records will not be deleted!`
                    }, old_message));
                });
            }
        } else if (youtubeCommands.includes(discord_command)) {
            if ([`${cp}`, `${cp}play`, `${cp}p`, `${cp}playnext`, `${cp}pn`].includes(discord_command)) {
                const playnext = [`${cp}playnext`, `${cp}pn`].includes(discord_command);
                function detect_unsupported_play_input(search_query) {
                    if (search_query.includes('spotify.com')) {
                        return true;
                    } else if (search_query.includes('soundcloud.com')) {
                        return true;
                    } else if (search_query.includes('twitter.com')) {
                        return true;
                    } else if (search_query.includes('facebook.com')) {
                        return true;
                    } else {
                        return false;
                    }
                }
                if (detect_unsupported_play_input(command_args.join(' '))) {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`Sorry playing music from that website isn't supported!`,
                        description:`Use \`${discord_command}\` to see how to use this command.`
                    }));
                } else if (old_message.attachments.first()?.attachment?.endsWith('.mp3')) {
                    playUserUploadedMP3(old_message, playnext);
                } else if (command_args.join('').length > 0) {
                    if (await detect_remote_mp3(command_args.join(' '))) {
                        playRemoteMP3(old_message, command_args.join(' '), playnext);
                    } else if (detect_broadcastify(command_args.join(' '))) {
                        playBroadcastify(old_message, command_args.join(' '), playnext);
                    } else {
                        playYouTube(old_message, command_args.join(' '), playnext);
                    }
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`That's just not how you use this command!`,
                        description:`Take a look below to see how you should have done it!`,
                        fields:[
                            {name:'Playing Videos From YouTube:', value:`${'```'}\n${discord_command} ussr national anthem\n${'```'}${'```'}\n${discord_command} https://youtu.be/U06jlgpMtQs\n${'```'}`},
                            {name:'Playing Playlists From YouTube:', value:`${'```'}\n${discord_command} https://www.youtube.com/watch?v=CJHJAzVXvgk&list=OLAK5uy_nkeSq0KxbS-AoMa0j5Oh2d4IAkACXsrBI&index=1\n${'```'}${'```'}\n${discord_command} https://www.youtube.com/playlist?list=OLAK5uy_nkeSq0KxbS-AoMa0j5Oh2d4IAkACXsrBI\n${'```'}`},
                            {name:'Playing Broadcastify URLs:', value:`${'```'}\n${discord_command} https://www.broadcastify.com/webPlayer/22380\n${'```'}`},
                            {name:'Playing MP3 Files From The Internet:', value:`${'```'}\n${discord_command} ${bot_cdn_url}/the-purge.mp3\n${'```'}`},
                            {name:'Playing MP3 Files From Your Computer:', value:`${'```'}\n${discord_command}\n${'```'}(Don't forget to attach the .mp3 file to the message)`}
                        ],
                        image:`${bot_cdn_url}/mp3_command_usage.png`
                    }, old_message));
                }
            } else if ([`${cp}search`].includes(discord_command)) {
                const search_query = command_args.join(' ').trim();
                if (search_query.length > 0) {
                    const search_results = await util.forceYouTubeSearch(search_query, 9);
                    const reactions = search_results.map((search_result, index) => ({
                        emoji_name:`bot_emoji_${numberToWord(index+1)}`,
                        callback:(options_message, collected_reaction, user) => {
                            removeUserReactionsFromMessage(options_message);
                            options_message.delete({timeout:10000}).catch(error => console.warn(`Unable to delete message`, error));
                            playYouTube(old_message, `${search_result.link}`);
                        }
                    }));
                    const embed = new CustomRichEmbed({
                        title: 'Pick an item to play it!',
                        description: search_results.map((result, index) => {
                            const full_video_title = htmlEntitiesParser.decode(result.title);
                            const small_video_title = full_video_title.slice(0, 100);
                            const small_video_title_needed = small_video_title.length < full_video_title.length;
                            const video_title = small_video_title_needed ? `${small_video_title}...` : full_video_title;
                            const channel_section = `[${result.channelTitle}](https://youtube.com/channel/${result.channelId})`;
                            const title_section = `[${video_title}](https://youtu.be/${result.id})`;
                            return `${numberToEmoji(index+1)} — ${channel_section}\n${title_section}`
                        }).join('\n\n')
                    }, old_message);
                    const bot_message = await sendOptionsMessage(old_message.channel.id, embed, reactions, old_message.author.id);
                    client.setTimeout(() => { // Wait 2 minutes before removing the search menu
                        if (bot_message.deletable) bot_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    }, 1000 * 60 * 2);
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`Woah there!`,
                        description:`Try adding something after \`${discord_command}\` next time!`
                    }, old_message));
                }
            }
        } else if (musicControlCommands.includes(discord_command)) {
            if ([`${cp}summon`].includes(discord_command)) {
                const voice_channel_to_join = old_message.guild.channels.cache.get(command_args[0]) ?? old_message.member.voice.channel;
                voice_channel_to_join.join().then(() => {
                    old_message.channel.send(new CustomRichEmbed({title:`Controlling ${bot_common_name}`, description:`Summoned ${bot_common_name} to their channel`}, old_message));
                }).catch(() => {
                    old_message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Oi! What are you doing mate!`, description:`Get in a voice channel before summoning me!`}, old_message));
                });
            } else if ([`${cp}pause`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (old_message.guild.voice) {
                    server.audio_controller.pause();
                    old_message.channel.send(new CustomRichEmbed({title:`Controlling ${bot_common_name}`, description:'Paused The Music'}, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Oi! I'm not connected to a voice channel!`, description:`Try playing something first!`}, old_message));
                }
            } else if ([`${cp}resume`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (old_message.guild.voice) {
                    server.audio_controller.resume();
                    old_message.channel.send(new CustomRichEmbed({title:`Controlling ${bot_common_name}`, description:'Resumed The Music'}, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Oi! I'm not connected to a voice channel!`, description:`Try playing something first!`}, old_message));
                }
            } else if ([`${cp}volume`, `${cp}v`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (!server.dispatcher) {// There isn't anything to request volume from
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Nothing Is Playing Right Now!',
                        description:`You can't change the volume in conditions like this!`,
                    }, old_message));
                    return;
                }
                if (client.voice.connections.map(voiceConnection => voiceConnection.channel).includes(old_message.member.voice.channel)) {// See if the bot has an active voice connection shared with the user
                    server.volume_manager.setVolume(parseFloat(command_args[0]) || server.volume_manager.volume); // Don't use ?? here
                    sendVolumeControllerEmbed(old_message.channel.id, old_message);
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Volume Controller Error',
                        description:'Get in a voice call with the bot!'
                    }, old_message));
                }
            } else if ([`${cp}skip`, `${cp}s`, `${cp}next`, `${cp}n`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                old_message.channel.send(new CustomRichEmbed({
                    title:`Controlling ${bot_common_name}`,
                    description:`Skipped the current song!`
                }, old_message));
                server.audio_controller.skip();
            } else if ([`${cp}replay`, `${cp}r`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (server.queue_manager.last_removed) {
                    server.queue_manager.addItem(server.queue_manager.last_removed, 1);
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Sorry, I forgot something along the way!',
                        description:`It would seem that I'm unable to replay that!`
                    }, old_message));
                }
            } else if ([`${cp}queue`, `${cp}q`].includes(discord_command)) {
                const queue_manager = servers[old_message.guild.id].queue_manager;
                if (queue_manager.queue.length > 0) {
                    if (command_args.length > 0) {
                        if (['items', 'i'].includes(command_args[0])) {
                            const queue_page_size = 10;
                            let page_index = 0;
                            let queue_pages = [];
                            function makeQueueEmbed() {
                                const entire_queue_formatted = queue_manager.queue.map((queue_item, index) => {
                                    if (queue_item.type === 'youtube') {
                                        return {name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(), value:`[${queue_item.metadata.videoInfo.title}](https://youtu.be/${queue_item.metadata.videoInfo.video_id}) by [${queue_item.metadata.videoInfo.author.name}](${queue_item.metadata.videoInfo.author.channel_url})`};
                                    } else if (queue_item.type === 'tts') {
                                        return {name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(), value:`${queue_item.metadata.text.slice(0, 50)}`};
                                    } else if (queue_item.type === 'mp3') {
                                        return {name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(), value:`${queue_item.metadata.mp3_file_name}`};
                                    } else {
                                        return {name:`[ ${index + 1} ] ${queue_item.type}`.toUpperCase(), value:`Unknown Content`};
                                    }
                                });
                                queue_pages = array_chunks(entire_queue_formatted, queue_page_size);
                                if (queue_pages[page_index]) {// The queue is populated
                                    return new CustomRichEmbed({
                                        title:`Requested The Queue`,
                                        description:`There are currently ${queue_manager.queue.length} items in the queue.\nCurrently on queue page: \`[ ${page_index+1} ]\` of \`[ ${queue_pages.length} ]\`.`,
                                        fields:[...queue_pages[page_index]]
                                    }, old_message);
                                } else {// The queue is not populated
                                    return new CustomRichEmbed({
                                        title:`Requested The Queue`,
                                        description:`The queue is currently empty!`
                                    }, old_message);
                                }
                            }
                            sendOptionsMessage(old_message.channel.id, makeQueueEmbed(), [
                                {
                                    emoji_name:'bot_emoji_angle_left',
                                    callback:(options_message, collected_reaction, user) => {
                                        removeUserReactionsFromMessage(options_message);
                                        page_index--;
                                        if (page_index < 0) {page_index = queue_pages.length-1;}
                                        options_message.edit(makeQueueEmbed());
                                    }
                                }, {
                                    emoji_name:'bot_emoji_angle_right',
                                    callback:(options_message, collected_reaction, user) => {
                                        removeUserReactionsFromMessage(options_message);
                                        page_index++;
                                        if (page_index > queue_pages.length-1) {page_index = 0;}
                                        options_message.edit(makeQueueEmbed());
                                    }
                                }
                            ]);
                        } else if (['autoplay', 'a'].includes(command_args[0])) {
                            await queue_manager.toggleAutoplay();
                            old_message.channel.send(new CustomRichEmbed({title:`${queue_manager.autoplay_enabled ? 'Enabled' : 'Disabled'} Autoplay Of Related YouTube Videos In The Queue`}, old_message));
                        } else if (['loop', 'l'].includes(command_args[0])) {
                            if (['item', 'i'].includes(command_args[1])) {
                                await queue_manager.toggleLoop();
                                await queue_manager.setLoopType('single');
                                old_message.channel.send(new CustomRichEmbed({title:`${queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} Queue Looping For The First Item`}, old_message));
                            } else if (['all', 'a'].includes(command_args[1])) {
                                await queue_manager.toggleLoop();
                                await queue_manager.setLoopType('multiple');
                                old_message.channel.send(new CustomRichEmbed({title:`${queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} Queue Looping For The Entire Queue`}, old_message));
                            } else if (['shuffle', 's'].includes(command_args[1])) {
                                await queue_manager.toggleLoop();
                                await queue_manager.setLoopType('shuffle');
                                old_message.channel.send(new CustomRichEmbed({title:`${queue_manager.loop_enabled ? 'Enabled' : 'Disabled'} Queue Shuffle Looping For The Entire Queue`}, old_message));
                            } else {
                                old_message.channel.send(new CustomRichEmbed({
                                    title:'Possible Queue Loop Commands',
                                    description:`${'```'}\n${['i | item', 'a | all', 's | shuffle'].map(item => `${discord_command} ${command_args[0]} [ ${item} ]`).join('\n')}${'```'}`
                                }, old_message));
                            }
                        } else if (['shuffle', 's'].includes(command_args[0])) {
                            await queue_manager.shuffleItems();
                            old_message.channel.send(new CustomRichEmbed({title:`Shuffled Items In The Queue`}, old_message));
                        } else if (['remove', 'r'].includes(command_args[0])) {
                            if (command_args[1]) {
                                const remove_index_number = parseInt(command_args[1]);
                                if (!isNaN(remove_index_number)) {
                                    queue_manager.removeItem(remove_index_number);
                                    old_message.channel.send(new CustomRichEmbed({title:`Removed An Item From The Queue`, description:`Removed item at position #${remove_index_number}!`}, old_message));
                                } else {
                                    old_message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Woah dude!`, description:`I can't remove ${remove_index_number} from the queue!\nTry specifying a number!`}, old_message));
                                }
                            } else {
                                old_message.channel.send(new CustomRichEmbed({
                                    title:`Here's How To Remove Items From The Queue`,
                                    description:`Simply specify the index of the song!\nExample Usage:${'```'}\n${discord_command} ${command_args[0]} 2${'```'}The above will remove the 2nd item in the queue.`
                                }, old_message));
                            }
                        } else if (['clear', 'c'].includes(command_args[0])) {
                            old_message.channel.send(new CustomRichEmbed({title:`Removed ${queue_manager.queue.length-1} Uninvoked Items From The Queue`}, old_message));
                            queue_manager.clearItems(false);
                        }
                    } else {//Show the queue commands
                        old_message.channel.send(new CustomRichEmbed({
                            title:'Possible Queue Commands',
                            description:`${'```'}\n${['items | i', 'loop | l', 'shuffle | s', 'remove | r', 'clear | c'].map(item => `${discord_command} [ ${item} ]`).join('\n')}${'```'}`
                        }, old_message));
                    }
                } else {//Nothing is in the Queue
                    old_message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Does Not Compute! The Queue Is Empty!`, description:'What were you trying to do there?'}, old_message));
                }
            } else if ([`${cp}controls`, `${cp}c`].includes(discord_command)) {
                if (servers[old_message.guild.id].queue_manager.queue.length > 0) {
                    sendMusicControllerEmbed(old_message.channel.id, old_message);
                } else {
                    old_message.channel.send(new CustomRichEmbed({color:0xFFFF00, title:`Uh Oh! What are you doing mate! ${old_message.author.username}`, description:`Nothing is playing right now!`}, old_message));
                }
            } else if ([`${cp}nowplaying`, `${cp}np`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (server.queue_manager.queue.length > 0) {
                    if (server.queue_manager.queue[0].type === 'youtube') {
                        sendYtDiscordEmbed(old_message, server.queue_manager.queue[0].metadata.videoInfo, 'Currently Playing');
                    } else if (server.queue_manager.queue[0].type === 'tts') {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Currently Playing: ${server.queue_manager.queue[0].type.toUpperCase()}`,
                            description:`${server.queue_manager.queue[0].metadata.text.slice(0, 50)}`
                        }));
                    } else if (server.queue_manager.queue[0].type === 'mp3') {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Currently Playing: ${server.queue_manager.queue[0].type.toUpperCase()}`,
                            description:`${server.queue_manager.queue[0].metadata.mp3_file_name}`
                        }));
                    } else {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Currently Playing: ${server.queue_manager.queue[0].type.toUpperCase()}`
                        }));
                    }
                }
            } else if ([`${cp}timestamp`, `${cp}ts`].includes(discord_command)) {
                old_message.channel.send(new CustomRichEmbed({title:`The Current Queue Item Timestamp Is: ${servers[old_message.guild.id].audio_controller.timestamp}`}, old_message));
            }
        } else if (disconnectCommands.includes(discord_command)) {
            old_message.channel.send(new CustomRichEmbed({title:`Controlling ${bot_common_name}`, description:`Told ${bot_common_name} to leave their voice channel.`}, old_message));
            servers[old_message.guild.id].audio_controller.disconnect();
        } else if (funCommands.includes(discord_command)) {
            if ([`${cp}poll`].includes(discord_command)) {
                if (command_args.join('').length > 0) {
                    const poll_args = old_message.content.replace(`${discord_command} `, '').split('\n');
                    const poll_question = poll_args[0];
                    const poll_choices = poll_args.slice(1);
                    function findBotNumberEmoji(num) {
                        const emoji_numbers_as_words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
                        return util.findCustomEmoji(`bot_emoji_${emoji_numbers_as_words[num]}`);
                    }
                    if (poll_question && poll_choices.length > 0) {
                        if (poll_choices.length < 10) {
                            old_message.channel.send(new CustomRichEmbed({
                                title:`Has created a poll!`,
                                thumbnail:`${bot_cdn_url}/Vote_2020-04-27_0.png`,
                                // description:`Click on an emoji to cast your vote!`,
                                fields:[
                                    {name:`Poll Question`, value:`${poll_question}`},
                                    {name:`Poll Choices`, value:`${poll_choices.map((pc, i) => `${findBotNumberEmoji(i)} — ${pc}`).join('\n\n')}`}
                                ],
                                footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                            }, old_message)).then(async bot_message => {
                                for (let i = 0; i < poll_choices.length; i++) {
                                    const bot_emoji = findBotNumberEmoji(i);
                                    await bot_message.react(bot_emoji);
                                }
                            });
                        } else {
                            old_message.channel.send(new CustomRichEmbed({
                                color:0xFFFF00,
                                title:`Whoops!`,
                                description:`Due to the number machine being broken, only 9 answers for a poll are allowed!`,
                                footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                            }, old_message));
                        }
                    } else {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`Whoops!`,
                            description:`That's not how you do it!\nI need a question and choices!`,
                            fields:[
                                {name:'Example Poll', value:`${'```'}\n${discord_command} Is this a cool feature?\nYes!\nNo!${'```'}`}
                            ],
                            footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                        }, old_message));
                    }
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Time to get some results!`,
                        description:`You can create a poll by doing the following!`,
                        fields:[
                            {name:'Example Poll', value:`${'```'}\n${discord_command} Is this a cool feature?\nYes!\nNo!${'```'}`}
                        ]
                    }, old_message));
                }
            } else if ([`${cp}roast`].includes(discord_command)) {
                if (!old_message.channel.nsfw) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'This command requires an NSFW channel!',
                        description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
                    }, old_message));
                    return;
                }
                const roaster = old_message.author;
                const roastee = old_message.mentions.users.first() ?? old_message.author;
                const roast = `${array_random(JSON.parse(roasts_json))}`;
                old_message.channel.send(`${roaster} is roasting ${roastee}\nHey ${roastee} ${roast}`);
                if (roaster?.id === roastee?.id) {
                    old_message.channel.send(`Next time you should try roasting someone besides yourself!`);
                }
            } else if ([`${cp}akinator`].includes(discord_command)) {
                const akinator_api = new Akinator_API('en');
                await akinator_api.start();
                let question_num = 1;
                async function _send_questions() {
                    async function _proceed_with_game(rich_embed, step_num) {
                        if (!question_active) return;
                        question_num++;
                        question_active = false;
                        await akinator_api.step(step_num);
                        if (akinator_api.progress >= 70 || akinator_api.currentStep >= 78) {// Akinator has a guess for us!
                            await akinator_api.win();
                            const akinator_guess = akinator_api.answers[0];
                            // if (parseFloat(akinator_guess.proba) > 0.75 || akinator_api.currentStep >= 78) {}
                            rich_embed.channel.send(new CustomRichEmbed({
                                title:'Akinator Time!',
                                description:`**It is very clear to me now!**\nYou are looking for this character:`,
                                thumbnail:`${bot_cdn_url}/akinator_idle.png`,
                                fields:[
                                    {name:'Character Name', value:`${akinator_guess.name}`},
                                    {name:'Character Description', value:`${akinator_guess.description}`},
                                    {name:'Character Picture', value:`[Link](${akinator_guess.absolute_picture_path})`}
                                ],
                                image:`${akinator_guess.absolute_picture_path}`
                            }, old_message));
                        } else {// Akinator needs more!
                            _send_questions();
                        }
                    }
                    let question_active = true;
                    const options_embed = new CustomRichEmbed({
                        title:'Akinator Time!',
                        description:'Choose an option to continue.',
                        thumbnail:`${bot_cdn_url}/akinator_idle.png`,
                        fields:[
                            {name:`Question ${constructNumberUsingEmoji(question_num)}`, value:`**${akinator_api.question}**`},
                            {name:'Answers', value:`${akinator_api.answers.map((value, index) => `${constructNumberUsingEmoji(index+1)} - ${value}`).join('\n')}`}
                        ]
                    }, old_message);
                    const reactions = [
                        ...(question_num > 1 ? [{
                            emoji_name:'bot_emoji_angle_left',
                            callback:async (options_message, collected_reaction, user) => {
                                await akinator_api.back();
                                question_num--;
                                _send_questions();
                            }
                        }] : []),
                        ...akinator_api.answers.map((value, index) => ({
                            emoji_name:`${numberToEmoji(index+1).name}`,
                            callback:async (options_message, collected_reaction, user) => {
                                _proceed_with_game(options_message, index);
                            }
                        }))
                    ];
                    sendOptionsMessage(old_message.channel.id, options_embed, reactions, old_message.author.id);
                } _send_questions();
            } else if ([`${cp}tictactoe`].includes(discord_command)) {
                const default_game_board = [
                    `     |     |     `,
                    `  1  |  2  |  3  `,
                    `_____|_____|_____`,
                    `     |     |     `,
                    `  4  |  5  |  6  `,
                    `_____|_____|_____`,
                    `     |     |     `,
                    `  7  |  8  |  9  `,
                    `     |     |     `
                ].join('\n');
                const game_values = ['-', '-', '-', '-', '-', '-', '-', '-', '-'];
                function contructGameBoard(game_values) {
                    let new_game_board = `${default_game_board}`;
                    for (let index=0; index < game_values.length; index++) {
                        new_game_board = new_game_board.replace(`${index+1}`, `${game_values[index]}`);
                    }
                    return new_game_board;
                }
                function makeMove(location=1, mark='x') {
                    if (game_values[location-1] !== '-') return false;
                    game_values[location-1] = `${mark}`;
                    return true;
                }
                function makePlayerTurnEmbed(current_player) {
                    return new CustomRichEmbed({
                        title:`${current_player === 'PLAYER_A' ? 'Make a move Player A!' : `It's your turn Player B!`}`,
                        description:`${current_player === 'PLAYER_A' ? 'Player A' : 'Player B'} is the letter \`${current_player === 'PLAYER_A' ? 'x' : 'o'}\``,
                        fields:[
                            {name:'Game', value:`${'```'}\n${contructGameBoard(game_values)}\n${'```'}`},
                            {name:'Button Mapping', value:`${'```'}\n1 2 3\n4 5 6\n7 8 9\n${'```'}`}
                        ],
                        footer:{iconURL:`${client.user.displayAvatarURL({dynamic:true})}`, text:`${discord_command}`}
                    });
                }
                const reactions = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => ({
                    emoji_name:`bot_emoji_${numberToWord(num)}`,
                    callback:(options_message, collected_reaction, user) => {
                        removeUserReactionsFromMessage(options_message);
                        if (!makeMove(num, current_player === 'PLAYER_A' ? 'x' : 'o')) return;
                        current_player = current_player === 'PLAYER_A' ? 'PLAYER_B' : 'PLAYER_A';
                        options_message.edit(makePlayerTurnEmbed(current_player));
                    }
                }));
                let current_player = 'PLAYER_A';
                sendOptionsMessage(old_message.channel.id, makePlayerTurnEmbed(current_player), reactions);
            } else if ([`${cp}cards`].includes(discord_command)) {
                if (!old_message.channel.nsfw) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'This command requires an NSFW channel!',
                        description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
                    }, old_message));
                    return;
                }
                old_message.channel.send(new CustomRichEmbed({
                    title:`Cards Against ${bot_common_name}`,
                    description:'Fetching random card set!\nPlease wait...'
                })).then(bot_message => {
                    axios.get(process.env.CARDS_AGAINST_HUMANITY_API_URL).then(res => {
                        client.setTimeout(() => {
                            const black_card = array_random(res.data.blackCards.filter(card => card.pick === 2));
                            const white_cards = array_make(black_card.pick).map(() => array_random(res.data.whiteCards));
                            bot_message.edit(new CustomRichEmbed({
                                title:`Cards Against ${bot_common_name}`,
                                fields:[
                                    {name:'Black Card', value:`\`\`\`${black_card.text}\`\`\``},
                                    ...white_cards.map(card => ({name:'White Card', value:`\`\`\`${card}\`\`\``, inline:true}))
                                ]
                            }, old_message));
                        }, 1500);
                    });
                })
            } else if ([`${cp}dogeify`].includes(discord_command)) {
                const user_text = clean_command_args.join(' ');
                if (user_text.length === 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`Couldn't dogeify:`,
                        description:`Try typing a sentence after the command!`,
                        thumbnail:`${bot_cdn_url}/doge-static.gif`
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Dogeifying:',
                        description:`\`\`\`${user_text}\`\`\``,
                        image:`${bot_cdn_url}/doge-animated.gif`
                    }, old_message)).then(bot_message => {
                        dogeify(user_text).then(dogeified_text => {
                            client.setTimeout(() => {
                                bot_message.edit(new CustomRichEmbed({
                                    title:'Dogeified',
                                    description:`\`\`\`${user_text}\`\`\`into\`\`\`${dogeified_text}\`\`\``,
                                    thumbnail:`${bot_cdn_url}/doge-static.jpg`
                                }, old_message));
                            }, 3500);
                        });
                    });
                }
            } else if ([`${cp}spongebobmock`].includes(discord_command)) {
                const user_text = clean_command_args.join(' ');
                if (user_text.length === 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:`Couldn't Spongebob Mock:`,
                        description:`Try typing a sentence after the command!`
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Generating Spongebob Mock:',
                        description:`\`\`\`${user_text}\`\`\``,
                        image:`${bot_cdn_url}/spongebob-mocking-animated.gif`
                    }, old_message)).then(bot_message => {
                        axios.get(`${bot_api_url}/spmock?text=${encodeURI(user_text)}`).then(res => {
                            if (res.data) {
                                client.setTimeout(() => {
                                    bot_message.edit(new CustomRichEmbed({
                                        title:'Generated Spongebob Mock',
                                        description:`\`\`\`${res.data?.original_text}\`\`\`into\`\`\`${res.data?.spmock_text}\`\`\``,
                                        thumbnail:`${bot_cdn_url}/spongebob-mocking.png`
                                    }, old_message));
                                }, 3500);
                            }
                        });
                    });
                }
            } else if ([`${cp}magic8ball`].includes(discord_command)) {
                old_message.channel.send(new CustomRichEmbed({
                    thumbnail:`${bot_cdn_url}/magic-8-ball.webp`,
                    title:`${bot_common_name} - 8 Ball Wizard`,
                    fields:[
                        {name:`You said:`, value:`${'```'}\n${clean_command_args.join(' ')}${'```'}`},
                        {name:`I say:`, value:`${'```'}\n${array_random(JSON.parse(magic8ball_json))}${'```'}`}
                    ]
                }, old_message));
            } else if ([`${cp}newyearsball`].includes(discord_command)) {
                let ball_number = 1;
                async function sendBall(old_ball_message) {
                    const ball = fs.readFileSync(`./files/new_years_ball/ball_${ball_number}.txt`).toString();
                    await old_ball_message.edit(new CustomRichEmbed({
                        title:`Ball ${ball_number}`,
                        description:`${'```'}\n${ball}\n${'```'}`
                    }));
                    await util.Timer(1000);
                    ball_number++;
                    if (ball_number > 11) return;
                    sendBall(old_ball_message);
                }
                old_message.channel.send(new CustomRichEmbed({title:`Preparing New Years Ball`})).then(old_ball_message => sendBall(old_ball_message));
            } else if ([`${cp}google`].includes(discord_command)) {
                if (!old_message.channel.nsfw) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'This command requires an NSFW channel!',
                        description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
                    }, old_message));
                    return;
                }
                old_message.channel.send(new CustomRichEmbed({
                    title:`Searching Google For:`,
                    description:`${'```'}\n${clean_command_args.join(' ')}${'```'}`
                }, old_message)).then(bot_message => {
                    googleIt({'options':{'no-display':true}, 'query':clean_command_args.join(' ')}).then(results => {
                        bot_message.edit(new CustomRichEmbed({
                            title:`Searched Google For:`,
                            description:`${'```'}\n${clean_command_args.join(' ')}${'```'}`,
                            fields:results.map(result => ({name:`${result.title}`, value:`<${result.link}>\n${result.snippet}`}))
                        }, old_message));
                    }).catch(error => logUserError(old_message, error));
                });
            } else if ([`${cp}reddit`].includes(discord_command)) {
                if (!old_message.channel.nsfw) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'This command requires an NSFW channel!',
                        description:'Discord Bot List / Top.gg requires that this command can only be executed in a NSFW channel!'
                    }, old_message));
                    return;
                }
                const subreddit_to_lookup = (command_args[0] || '').replace('/r', '');
                axios.post(`https://www.reddit.com/r/${subreddit_to_lookup||'funny'}/top.json?limit=5`).then(response => {
                    response.data.data.children.map(post => post.data).slice(0, 5).forEach(data => {
                        old_message.channel.send(new CustomRichEmbed({
                            author:{iconURL:`${bot_cdn_url}/reddit-logo.png`, name:'Reddit'/*data.author_fullname*/},
                            title:data.title,
                            description:`https://www.reddit.com${data.permalink}`,
                            image:(data.url.startsWith('https://i') ? data.url : null)
                        }, old_message));
                    });
                }).catch(() => {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Have you even used reddit?',
                        description:`\`${subreddit_to_lookup}\` isn't a valid subreddit!`
                    }, old_message));
                });
            } else if ([`${cp}rolldice`].includes(discord_command)) {
                function _rollDice(count=1, sides=6) {
                    const _dice = [];
                    for (let _die in array_make(count)) {
                        const _dice_number = random_range_inclusive(1, sides);
                        _dice[_die] = _dice_number;
                    }
                    return _dice;
                }
                if (command_args.join('').length > 0) {
                    const dice_args = command_args.join('').split(/[a-z]+/i); // Split using any letter (aka d)
                    const rolled_dice = _rollDice(parseInt(dice_args[0] ?? 1), parseInt(dice_args[1] ?? 6));
                    old_message.channel.send(new CustomRichEmbed({
                        title:`${dice_args[0]}, ${dice_args[1] ?? 6}-sided dice coming right up!`,
                        description:`You rolled \`${rolled_dice.join(` + `)}\` = ${constructNumberUsingEmoji(rolled_dice.reduce((a,b) => a + b))}`
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Rolled a 6-sided die!',
                        description:`You rolled a ${constructNumberUsingEmoji(_rollDice(1, 6)[0])}`
                    }, old_message));
                }
            }
        } else if (utilityCommands.includes(discord_command)) {
            if ([`${cp}embed`].includes(discord_command)) {
                if (old_message.content.replace(discord_command, ``).trim().length > 0) {
                    try {
                        let embed_segments_joined = old_message.content.replace(discord_command, ``);
                        const regex_embed_args = /\{\{(.*?)\}\}/g;
                        const regex_embed_args_bounds = /(\{\{|\}\})/g;
                        const potential_embed_image = `${embed_segments_joined.match(regex_embed_args)?.[0]}`.replace(regex_embed_args_bounds, '');
                        const embed_image = validator.isURL(potential_embed_image) ? potential_embed_image : undefined;
                        embed_segments_joined = embed_segments_joined.replace(regex_embed_args, '').replace(regex_embed_args_bounds, '');
                        const embed_segments = embed_segments_joined.split(`\n\n`);
                        const embed_title_desctiption = embed_segments[0].split(`\n`);
                        const embed_title = embed_title_desctiption[0];
                        const embed_desctiption = embed_title_desctiption.slice(1).join('\n');
                        const embed_fields = embed_segments.slice(1).map(field_joined => ({
                            name:`${field_joined.split('\n')[0]}`,
                            value:`${field_joined.split('\n')[1]}`
                        }));
                        // console.log({embed_segments, embed_title_desctiption, embed_title, embed_desctiption, embed_image, embed_fields});
                        old_message.channel.send(new CustomRichEmbed({
                            color: 0x000000,
                            author:{iconURL:old_message.member.user.displayAvatarURL({dynamic:true}), name:`Sent by @${old_message.member.user.tag} (${old_message.member.user.id})`},
                            title:`${embed_title}`,
                            description:`${embed_desctiption}`,
                            image:embed_image,
                            fields:embed_fields,
                            footer:{iconURL:`${bot_cdn_url}/Warning_Sign_2020-07-08_1.png`, text:`This message is not from or endorsed by ${bot_common_name}!`}
                        }));
                    } catch (error) {
                        console.trace(`Failed to send user-generated embed!`, error);
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`Whoops, something went wrong!`,
                            description:`Somehow you messed up making the embed and Discord didn't like it!`
                        }, old_message));
                    }
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`You can use this command to create embeds!`,
                        description:[
                            `**Try out the following!**`,
                            `${'```'}`,
                            `${discord_command} The title can go here`,
                            `The description can go here,`,
                            `and continue over here as well,`,
                            `and can extend even more beyond here!`,
                            ``,
                            `A Field Title can go here`,
                            `A Field Description can go here`,
                            ``,
                            `Another Field Title can go here`,
                            `Another Field Description can go here`,
                            ``,
                            `{{The image URL goes inside of double semi-brackets!}}`,
                            `${'```'}`
                        ].join('\n')
                    }, old_message));
                }
            } else if ([`${cp}remindme`].includes(discord_command)) {
                old_message.channel.send(new CustomRichEmbed({title:'Warning!', description:`${discord_command} is in BETA`}, old_message)).then(() => {
                    if (command_args.length > 0) {
                        const user_id = old_message.author.id;
                        const user_time = command_args.join(' ').match(/\{(.*)\}/) ? command_args.join(' ').match(/\{(.*)\}/).pop() : 'in 5 minutes';
                        const user_remind_message = command_args.join(' ').replace(`{${user_time}}`, '').trim() || 'default reminder';
                        const reminder = new Reminder(user_id, Sugar.Date.create(user_time), user_remind_message);
                        reminderManager.add(reminder).save();
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Reminder set for ${user_time}`,
                            description:`${Sugar.Date.create(user_time)}`
                        }, old_message));
                    } else {
                        old_message.channel.send(new CustomRichEmbed({
                            title:'Command Usage',
                            description:`${'```'}\n${discord_command} {in 10 minutes} hello world!\n${'```'}\nRemember to include the \`{}\`!`
                        }, old_message));
                    }
                });
            } else if ([`${cp}math`].includes(discord_command)) {
                if (command_args.length > 0) {
                    const math_to_evaluate = command_args.join(' ');
                    try {
                        const evaluated_math = mathjs.evaluate(math_to_evaluate);
                        old_message.channel.send(new CustomRichEmbed({
                            title:'I evaluated your math for you!',
                            description:`\`${math_to_evaluate}\` = \`${evaluated_math}\``
                        }, old_message));
                    } catch {
                        old_message.channel.send(new CustomRichEmbed({
                            title:'I failed you!',
                            description:`I couldn't evaluate \`${math_to_evaluate}\``
                        }, old_message));
                    }
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Command Usage',
                        description:`${'```'}\n${discord_command} 2 + 2\n${'```'}`
                    }, old_message));
                }
            } else if ([`${cp}serverinfo`].includes(discord_command)) {
                const guild = client.guilds.cache.get(command_args[0]) ?? old_message.guild;
                const guild_roles = guild.roles.cache.sort((a, b) => a.position - b.position).map(role => `<@&${role.id}>`);
                old_message.channel.send(new CustomRichEmbed({
                    title:`Don't go wild with this guild information!`,
                    fields:[
                        {name:'Discord Id', value:`${guild.id}`},
                        {name:'Name', value:`${guild.name}`},
                        {name:'Region', value:`${guild.region}`},
                        {name:'Owner', value:`<@!${guild.owner.id}>`},
                        {name:'Bots', value:`${guild.members.cache.filter(m => m.user.bot).size}`},
                        {name:'Members', value:`${guild.members.cache.filter(m => !m.user.bot).size}`},
                        {name:'Member Verification Level', value:`${guild.verificationLevel}`},
                        {name:'Explicit Content Filter', value:`${guild.explicitContentFilter}`},
                        ...array_chunks(guild_roles, 32).map((guild_roles_chunk, chunk_index, guild_roles_chunks) => (
                            {name:`Roles ${chunk_index+1}/${guild_roles_chunks.length}`, value:`${guild_roles_chunk.join(' ')}`}
                        )),
                        {name:'Guild Features', value:`${guild.features.length > 0 ? `>>> ${guild.features.join('\n')}` : null}`},
                        {name:'Verified By Discord', value:`${guild.verified}`},
                        {name:'Official Discord Partner', value:`${guild.partnered}`},
                        {name:'Official System Channel', value:`${guild.systemChannel ?? null}`},
                        {name:'Official Updates Channel', value:`${guild.publicUpdatesChannel ?? null}`},
                        {name:'Official Rules Channel', value:`${guild.rulesChannel ?? null}`},
                        {name:'Created On', value:`${guild.createdAt}`},
                        {name:'Guild Icon', value:`[Link](${guild.iconURL({format:'png', size:1024, dynamic:true})})`}
                    ],
                    image:guild.iconURL({format:'png', size:1024, dynamic:true})
                }, old_message));
            } else if ([`${cp}channelinfo`].includes(discord_command)) {
                const channel = client.channels.cache.get(command_args[0]) ?? old_message.channel;
                old_message.channel.send(new CustomRichEmbed({
                    title:`Don't go wild with this channel information!`,
                    fields:[
                        {name:'Discord Id', value:`${channel.id}`},
                        {name:'Name', value:`${channel.name}`},
                        {name:'Type', value:`${channel.type}`},
                        {name:'Position', value:`${channel.position ?? 'N/A'}`},
                        {name:'Parent', value:`${channel?.parent?.name ?? 'N/A'}`},
                        {name:'Members', value:`${channel.type === 'voice' ? (channel?.members?.map(m => `${m}`)?.join(' ') ?? 'N/A') : 'N/A'}`},
                        {name:`Deletable`, value:`${channel?.deletable ?? 'N/A'}`},
                        {name:`Editable`, value:`${channel?.editable ?? 'N/A'}`},
                        {name:`Joinable`, value:`${channel?.joinable ?? 'N/A'}`},
                        {name:`Speakable`, value:`${channel?.speakable ?? 'N/A'}`},
                        {name:`Manageable`, value:`${channel?.manageable ?? 'N/A'}`},
                        {name:'Created On', value:`${channel.createdAt}`},
                    ]
                }, old_message));
            } else if ([`${cp}memberinfo`].includes(discord_command)) {
                const user = old_message.guild.members.cache.get(command_args[0]) || old_message.mentions.members.first() || old_message.member;
                if (user) {
                    const guildMember = old_message.guild.members.resolve(user);
                    const member_permissions = guildMember.permissions.toArray().filter(permission => !(new Discord.Permissions(Discord.Permissions.DEFAULT).toArray().includes(permission))).join('\n');
                    const member_roles = guildMember.roles.cache.map(role => `${role}`);
                    const member_joined_index = Array.from(old_message.guild.members.cache.values()).sort((a, b) => a.joinedTimestamp - b.joinedTimestamp).findIndex(m => m.id === guildMember.id);
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Don't go wild with this user information!`,
                        fields:[
                            {name:'Discord Id', value:`${guildMember.id}`, inline:true},
                            {name:'Nickname', value:`${guildMember.nickname || 'N/A'}`, inline:true},
                            {name:'Display Name', value:`${guildMember.displayName || 'N/A'}`, inline:true},
                            {name:'Username', value:`${guildMember.user.username || 'N/A'}`, inline:true},
                            {name:'Discriminator', value:`#${guildMember.user.discriminator || 'N/A'}`, inline:true},
                            {name:`Permissions`, value:`${'```'}\n${member_permissions}\n${'```'}`},
                            ...array_chunks(member_roles, 32).map((member_roles_chunk, chunk_index, member_roles_chunks) => (
                                {name:`Roles ${chunk_index+1}/${member_roles_chunks.length}`, value:`${member_roles_chunk.join(' ')}`}
                            )),
                            {name:`Manageable`, value:`${guildMember.manageable}`, inline:true},
                            {name:`Kickable`, value:`${guildMember.kickable}`, inline:true},
                            {name:`Bannable`, value:`${guildMember.bannable}`, inline:true},
                            {name:'Joined Position', value:`${member_joined_index + 1}`},
                            {name:'Joined Server On', value:`${guildMember.joinedAt}`},
                            {name:'Account Created On', value:`${guildMember.user.createdAt}`},
                            {name:'Profile Picture', value:`[Link](${guildMember.user.displayAvatarURL({dynamic:true, size:1024})})`}
                        ],
                        image:guildMember.user.displayAvatarURL({dynamic:true, size:1024})
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Uh Oh!',
                        description:'That was an invalid @user_mention!',
                        fields:[{name:'Example usage:', value:`${'```'}\n${discord_command} @user${'```'}`}]
                    }, old_message));
                }
            } else if ([`${cp}roleinfo`].includes(discord_command)) {
                const role = old_message.guild.roles.cache.get(command_args[0]) || old_message.mentions.roles.first();
                if (role) {
                    const role_permissions = role.permissions.toArray().join('\n');
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Don't go wild with this role information!`,
                        fields:[
                            {name:'Discord Id', value:`${role.id}`, inline:true},
                            {name:'Name', value:`${role.name}`, inline:true},
                            {name:'Color', value:`${role.hexColor}`, inline:true},
                            {name:'Position', value:`${role.position}`, inline:true},
                            {name:'Hoisted', value:`${role.hoist}`, inline:true},
                            {name:'Managed', value:`${role.managed}`, inline:true},
                            {name:`Mentionable`, value:`${role.mentionable}`, inline:true},
                            {name:`Editable`, value:`${role.editable}`, inline:true},
                            {name:`Bots`, value:`${role.members.filter(m => m.user.bot).size}`, inline:true},
                            {name:`Members`, value:`${role.members.filter(m => !m.user.bot).size}`, inline:true},
                            {name:'Created On', value:`${role.createdAt}`},
                            {name:`Permissions`, value:`${'```'}\n${role_permissions}${'```'}`},
                        ]
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Uh Oh!',
                        description:'That was an invalid @role_mention!',
                        fields:[{name:'Example usage:', value:`${'```'}\n${discord_command} @role${'```'}`}]
                    }, old_message));
                }
            } else if ([`${cp}ipinfo`].includes(discord_command)) {
                if (command_args[0]) {
                    axios.get(`http://ip-api.com/json/${command_args[0]}?fields=query,city,regionName,country,zip,isp,org`).then(res => {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`IP Info`,
                            description:`Found results for: ${res.data.query}!`,
                            fields:Object.keys(res.data).map((key) => [key, res.data[key]]).map(props => ({name:props[0], value:props[1] || 'not found'}))
                        }, old_message));
                    }).catch(error => logUserError(old_message, error));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`You aren't trying to spy on people now, are you?`,
                        description:`With great power, comes great responsibility. Stay legal my friend!`,
                        thumbnail:`${bot_cdn_url}/encryption-lock-info.jpg`,
                        fields:[
                            {name:'Command Usage', value:`\`\`\`${discord_command} IP_ADDRESS_HERE\`\`\``}
                        ]
                    }, old_message));
                }
            } if ([`${cp}tts`].includes(discord_command)) {
                const command = DisBotCommander.commands.find(cmd => cmd.aliases.includes(discord_command_without_prefix));
                command.execute(client, old_message, {
                    command_prefix:cp,
                    clean_command_args:clean_command_args,
                    discord_command:discord_command,
                    guild_config:guild_config
                });
            } else if ([`${cp}googletranslate`].includes(discord_command)) {
                if (command_args.join('').length > 0) {
                    const lang_code_match = command_args.join(' ').match(/\{(.*)\}/);
                    const translate_to = lang_code_match ? lang_code_match.pop() : 'en';
                    const translate_this = command_args.join(' ').replace(`{${translate_to}}`, '').trim();
                    translate(translate_this, {to:translate_to}).then(translated_text => {
                        old_message.channel.send(new CustomRichEmbed({
                            title:'Time to translate!',
                            fields:[
                                {name:'Translated', value:`\`\`\`${translate_this}\`\`\``},
                                {name:`To <${translate_to}>`, value:`\`\`\`${translated_text}\`\`\``}
                            ]
                        }, old_message));
                    }).catch(error => logUserError(old_message, error));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Uh Oh! What are you trying to do!',
                        description:`Proper Command Usage:\`\`\`${discord_command} hallo dort aus Deutschland!\`\`\``
                    }, old_message));
                }
            } else if ([`${cp}langcodes`].includes(discord_command)) {
                if (command_args[0] === 'ibm') {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Here are the language codes that you can use with ${cp}tts`,
                        description:`\`\`\`${Object.entries(ibm_languages_json).map(item => `{${item[0]}} (${item[1]})`).join('\n')}\`\`\``,
                        fields:[
                            {name:'Example usage:', value:`${'```'}\n${cp}tts {en-GB_KateV3Voice} Oi mate, watcha doing there!${'```'}`}
                        ]
                    }, old_message));
                } else if (command_args[0] === 'google') {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Here are the language codes that you can use with ${cp}tts and ${cp}googletranslate`,
                        description:`\`\`\`${Object.entries(google_languages_json).map(item => `{${item[0]}} (${item[1]})`).join('\n')}\`\`\``,
                        fields:[
                            {name:'Example usage:', value:`${'```'}\n${cp}tts {en-uk} Oi mate, watcha doing there!${'```'}`},
                            {name:'Example usage:', value:`${'```'}\n${cp}googletranslate {de} This will be translated to German!${'```'}`}
                        ]
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Try the following commands instead!',
                        description:`${'```'}\n${discord_command} ibm\n${'```'}or${'```'}\n${discord_command} google\n${'```'}`
                    }));
                }
            } else if ([`${cp}detectlang`].includes(discord_command)) {
                if (command_args.join('').length > 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Wants To Know What Language This Is`,
                        description:`The language for ${'```' + command_args.join(' ') + '```'} is ${languageDetector.detect(command_args.join(' ')).filter(lang_array => lang_array[0] !== 'pidgin')[0][0]}`
                    }, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Uh Oh! What are you trying to do!',
                        description:`Proper Command Usage:\`\`\`${discord_command} hallo dort aus Deutschland!\`\`\``
                    }, old_message));
                }
            }
        } else if (adminCommands.includes(discord_command)) {
            const guild_admin_roles = guild_config.admin_roles ?? [];
            const guild_moderator_roles = guild_config.moderator_roles ?? [];

            const hasGuildAdminRole = old_message.member.roles.cache.filter(role => guild_admin_roles.includes(role.id)).size > 0;
            const hasGuildModeratorRole = old_message.member.roles.cache.filter(role => guild_moderator_roles.includes(role.id)).size > 0;
            const hasGuildAdminPerm = old_message.member.hasPermission('ADMINISTRATOR');

            const hasBotAdmin = isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'guild_admin');
            const hasBotOwner = isThisBotsOwner(old_message.member.id);

            const isModeratorWorthy = hasGuildModeratorRole;
            const isAdminWorthy = hasGuildAdminRole || hasGuildAdminPerm;
            const isSuperWorthy = hasBotAdmin || hasBotOwner;

            const isWorthyOfModeratorCommands = isModeratorWorthy || isAdminWorthy || isSuperWorthy;
            const isWorthyOfAdminCommands = isAdminWorthy || isSuperWorthy;

            if (!isWorthyOfModeratorCommands && !isWorthyOfAdminCommands) {
                old_message.channel.send(new CustomRichEmbed({
                    color:0xFF00FF,
                    title:'Sorry but you are not a configured Moderator or Admin in this guild!',
                    description:'You must ascend in order to obtain the power you desire.\n\nIf you are a moderator or admin in this server, tell one of your server admins about the command below.',
                    fields:[
                        {name:'Setting Bot Moderator Roles', value:`\`\`\`${cp}set_moderator_roles @role1 @role2 @role3 ...\`\`\``},
                        {name:'Setting Bot Admin Roles', value:`\`\`\`${cp}set_admin_roles @role1 @role2 @role3 ...\`\`\``}
                    ]
                }, old_message));
            } else {
                logAdminCommandsToGuild(old_message);
                if ([`${cp}clear`, `${cp}purge`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MANAGE_CHANNELS', 'MANAGE_MESSAGES'])) return;
                    if (command_args[0] && !isNaN(parseInt(command_args[0]))) {
                        const remove_number = util.math_clamp(parseInt(command_args[0]), 0, 100);
                        old_message.channel.bulkDelete(remove_number, true).then(() => {
                            const clear_message_enabled = guild_config.clear_message === 'enabled';
                            if (clear_message_enabled) {
                                old_message.channel.send(new CustomRichEmbed({
                                    title:`Perfectly balanced, as all things should be.`,
                                    description:`I deleted ${remove_number} messages for you.`,
                                    thumbnail:`${bot_cdn_url}/Thanos_Glow_Gauntlet.png`
                                }, old_message));
                            }
                        }).catch(error => logUserError(old_message, error));
                    } else {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`That's not how messages are cleared!`,
                            description:`Please specify a number after ${discord_command}!`
                        }, old_message));
                    }
                } else if ([`${cp}wipeout`].includes(discord_command)) {
                    if (!isWorthyOfAdminCommands) {sendNotAllowedCommand(old_message); return;}
                    if (!botHasPerms(old_message, ['MANAGE_CHANNELS'])) return;
                    sendConfirmationEmbed(old_message.author.id, old_message.channel.id, false, new CustomRichEmbed({
                        title:'Be very careful!',
                        description:'This command will clone this channel and then delete the old one!\nYou will lose all messages in this channel!\nDo you wish to continue?'
                    }), () => {
                        old_message.channel.clone({
                            reason:`Created using ${discord_command} by @${old_message.author.tag}`
                        }).then(cloned_channel => {
                            cloned_channel.setParent(old_message.channel.parent).then(new_channel => {
                                new_channel.setPosition(old_message.channel.position + 1).then(() => {
                                    old_message.channel.delete({reason:`Deleted using ${discord_command} by @${old_message.author.tag}`}).catch(error => console.warn(`Unable to delete channel`, error));
                                });
                            });
                        });
                    }, async (bot_message) => {
                        await bot_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                        old_message.channel.send(new CustomRichEmbed({title:'Canceled wipeout!'}, old_message));
                    });
                } else if ([`${cp}archive`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MANAGE_CHANNELS'])) return;
                    sendConfirmationEmbed(old_message.author.id, old_message.channel.id, false, new CustomRichEmbed({
                        title:'Do you wish to proceeed?',
                        description:'This command will archive this channel and prevent non-staff from viewing it'
                    }, old_message), async (bot_message) => {
                        const channel_to_archive = old_message.channel;
                        await channel_to_archive.overwritePermissions([{id:old_message.guild.roles.everyone, deny:['VIEW_CHANNEL']}], `${old_message.author.tag} archived the channel!`);
                        const potential_category_channel = old_message.guild.channels.find(channel => channel.type === 'category' && channel.name === bot_archived_channels_category_name);
                        const category_to_make = potential_category_channel ?? await old_message.guild.channels.create(`${bot_archived_channels_category_name}`, {
                            type:'category',
                            permissionOverwrites:[{id:old_message.guild.roles.everyone, deny:['VIEW_CHANNEL']}]
                        });
                        await channel_to_archive.setParent(category_to_make);
                        await old_message.channel.send(new CustomRichEmbed({title:'Archived channel!'}, old_message));
                        await bot_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    }, async (bot_message) => {
                        await old_message.channel.send(new CustomRichEmbed({title:'Canceled archive!'}, old_message));
                        await bot_message.delete({timeout:500}).catch(error => console.warn(`Unable to delete message`, error));
                    });
                } else if ([`${cp}afk`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MOVE_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    const afk_voice_channel_to_move_user_to = old_message.guild.afkChannelID;
                    if (!afk_voice_channel_to_move_user_to) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`This server does not have an AFK channel!`
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(guildMember => {
                        if (!isThisBotsOwner(old_message.member.id) && isThisBotsOwner(guildMember.id)) {return;}
                        if (isThisBot(guildMember.id)) {return;}
                        guildMember.voice.setChannel(old_message.guild.afkChannelID);
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}move`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MOVE_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    const voice_channel_to_move_user_to = old_message.guild.channels.filter(c => c.type === 'voice').get(command_args[1]);
                    if (!voice_channel_to_move_user_to) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`That voice channel doesn't exist!`
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(guildMember => {
                        if (!isThisBotsOwner(old_message.member.id) && isThisBotsOwner(guildMember.id)) {return;}
                        if (isThisBot(guildMember.id)) {return;}
                        guildMember.voice.setChannel(voice_channel_to_move_user_to);
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}yoink`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MOVE_MEMBERS'])) return;
                    if (!old_message.member.voice?.channel) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'You must be in a voice channel to use this command!'
                        }, old_message));
                        return;
                    }
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(guildMember => {
                        if (!isThisBotsOwner(old_message.member.id) && isThisBotsOwner(guildMember.id)) {return;}
                        if (isThisBot(guildMember.id)) {return;}
                        guildMember.voice.setChannel(old_message.member.voice.channel);
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}warn`].includes(discord_command)) {
                    const guild_config_manipulator = new GuildConfigManipulator(old_message.guild.id);
                    const user_warnings = guild_config_manipulator.config.user_warnings;
                    const warning_id = util.uniqueId();
                    const warning_user = client.users.cache.get(command_args[0]) ?? old_message.mentions.users.first();
                    const warning_reason = command_args.slice(1).join(' ');
                    const warning_timestamp = moment();
                    if (user_warnings.length >= 25) {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`I'm getting a bit crowded with the warnings!`,
                            description:`Please do \`${cp}warnings clear\` to clean it up!`
                        }, old_message));
                    }
                    if (warning_user) {
                        const warning_message = new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`You Have Been Warned By @${old_message.author.tag} In ${old_message.guild.name}!`,
                            description:`${warning_user} you have been warned for:${'```'}\n${warning_reason}\n${'```'}`
                        });
                        old_message.channel.send(warning_message).then(() => {
                            guild_config_manipulator.modifyConfig({
                                user_warnings:[
                                    ...user_warnings,
                                    {
                                        id:`${warning_id}`,
                                        user_id:`${warning_user.id}`,
                                        staff_id:`${old_message.author.id}`,
                                        reason:`${warning_reason}`,
                                        timestamp:`${warning_timestamp}`
                                    }
                                ]
                            });
                            warning_user.createDM().then(dmChannel => {
                                dmChannel.send(warning_message);
                            }).catch(() => {
                                old_message.channel.send(new CustomRichEmbed({
                                    color:0xFFFF00,
                                    description:`Failed to DM ${warning_user} the warning!`
                                }, old_message));
                            });
                        });
                    } else {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`I couldn't find that user!`,
                            description:'Make sure to @mention the user when warning them!',
                            fields:[
                                {name:`Example`, value:`${'```'}\n${discord_command} @user#0001${'```'}`}
                            ]
                        }, old_message));
                    }
                } else if ([`${cp}warnings`].includes(discord_command)) {
                    const guild_config_manipulator = new GuildConfigManipulator(old_message.guild.id);
                    const user_to_search_for = old_message.mentions.members.first();
                    const all_users_warnings = guild_config_manipulator.config.user_warnings;
                    if ([`clear`].includes(command_args[0])) {
                        const user_to_remove_warnings_from = client.users.resolve(user_to_search_for ?? command_args[1]);
                        const new_user_warnings = user_to_remove_warnings_from ? all_users_warnings.filter(warning => warning.user_id !== user_to_remove_warnings_from.id) : [];
                        guild_config_manipulator.modifyConfig({user_warnings:new_user_warnings});
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Removed all warnings ${user_to_remove_warnings_from ? `for @${user_to_remove_warnings_from.tag} ` : ''}in ${old_message.guild.name}!`
                        }, old_message));
                        return;
                    }
                    const user_warnings = user_to_search_for ? all_users_warnings.filter(user_warning => user_warning.user_id === user_to_search_for.id) : all_users_warnings;
                    const user_warnings_fields = user_warnings.map(user_warning => {
                        const user = client.users.cache.get(user_warning.user_id);
                        return {
                            name:`Warning Id: ${user_warning.id}`,
                            value:[
                                `**Staff Id:** ${user_warning.staff_id}`,
                                `**User:** @${user.tag} (${user.id})`,
                                `**Timestamp:** ${user_warning.timestamp})`,
                                `**Reason:** \`${user_warning.reason}\``
                            ].join('\n')
                        };
                    });
                    const pages = array_chunks(user_warnings_fields, 5);
                    let page_index = 0;
                    function makeEmbed() {
                        return new CustomRichEmbed({
                            title:`Here are the warnings for ${user_to_search_for ? `@${user_to_search_for.user.tag}` : 'all users'}!`,
                            description:[
                                `Do \`${discord_command} @user\` to view warnings for a specified user!`,
                                `Do \`${discord_command} clear\` to clear all warnings in the server!`,
                                `Do \`${discord_command} clear @user#0001\` to clear all warnings for a specified user!`,
                                `\nPage — ${page_index + 1} / ${pages.length}`
                            ].join('\n'),
                            fields:pages[page_index]
                        }, old_message);
                    }
                    sendOptionsMessage(old_message.channel.id, makeEmbed(), [
                        {
                            emoji_name:'bot_emoji_angle_left',
                            callback:(options_message, collected_reaction, user) => {
                                removeUserReactionsFromMessage(options_message);
                                page_index--;
                                if (page_index < 0) {page_index = pages.length-1;}
                                options_message.edit(makeEmbed());
                            }
                        }, {
                            emoji_name:'bot_emoji_angle_right',
                            callback:(options_message, collected_reaction, user) => {
                                removeUserReactionsFromMessage(options_message);
                                page_index++;
                                if (page_index > pages.length-1) {page_index = 0;}
                                options_message.edit(makeEmbed());
                            }
                        }
                    ]);
                } else if ([`${cp}mute`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MUTE_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(async guildMember => {
                        if (!isThisBotsOwner(old_message.member.id) && isThisBotsOwner(guildMember.id)) return;
                        if (isThisBot(guildMember.id)) return;
                        if (!guildMember.voice?.channel) {
                            old_message.channel.send(new CustomRichEmbed({
                                color:0xFFFF00,
                                title:`That user isn't in a voice channel right now!`
                            }, old_message));
                            return;
                        }
                        await guildMember.voice.setMute(!guildMember.voice.serverMute);
                        old_message.channel.send(new CustomRichEmbed({
                            title:`${guildMember.voice.serverMute ? 'Muted' : 'Unmuted'} @${user.tag} (${user.id})`
                        }, old_message));
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}deafen`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['DEAFEN_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(async guildMember => {
                        if (!isThisBotsOwner(old_message.member.id) && isThisBotsOwner(guildMember.id)) return;
                        if (isThisBot(guildMember.id)) return;
                        if (!guildMember.voice?.channel) {
                            old_message.channel.send(new CustomRichEmbed({
                                color:0xFFFF00,
                                title:`That user isn't in a voice channel right now!`
                            }, old_message));
                            return;
                        }
                        await guildMember.voice.setDeaf(!guildMember.voice.serverDeaf);
                        old_message.channel.send(new CustomRichEmbed({
                            title:`${guildMember.voice.serverDeaf ? 'Deafened' : 'Undeafened'} @${user.tag} (${user.id})`
                        }, old_message));
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}flextape`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MUTE_MEMBERS', 'DEAFEN_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(async guildMember => {
                        if (!isThisBotsOwner(old_message.member.id) && isThisBotsOwner(guildMember.id)) {return;}
                        if (isThisBot(guildMember.id)) {return;}
                        if (!guildMember.voice?.channel) {
                            old_message.channel.send(new CustomRichEmbed({
                                color:0xFFFF00,
                                title:`That user isn't in a voice channel right now!`
                            }, old_message));
                            return;
                        }
                        await guildMember.voice.setMute(!guildMember.voice.serverMute);
                        await guildMember.voice.setDeaf(guildMember.voice.serverMute);
                        old_message.channel.send(new CustomRichEmbed({
                            title:`${guildMember.voice.serverMute ? 'Flextaped' : 'Unflextaped'} @${user.tag} (${user.id})`
                        }, old_message));
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}giverole`].includes(discord_command)) {
                    if (!isWorthyOfAdminCommands) {sendNotAllowedCommand(old_message); return;}
                    if (!botHasPerms(old_message, ['MANAGE_ROLES'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    const guildMember = await old_message.guild.members.fetch(user);
                    const role_to_add = old_message.guild.roles.cache.get(command_args[1]) ?? old_message.mentions.roles.first();
                    if (guildMember && role_to_add) {
                        const user_is_greater_than_member = old_message.member.roles.highest.comparePositionTo(guildMember.roles.highest) > 0; // DO NOT TOUCH
                        const user_is_greater_than_role_to_add = old_message.member.roles.highest.comparePositionTo(role_to_add) >= 0; // DO NOT TOUCH
                        if (user_is_greater_than_member && user_is_greater_than_role_to_add) {
                            guildMember.roles.add(role_to_add).then(guildMember => {
                                old_message.channel.send(new CustomRichEmbed({
                                    title:`Role Manager`,
                                    description:`Added ${role_to_add} to ${guildMember.user.tag}`
                                }, old_message));
                            }).catch(console.warn);
                        } else {
                            old_message.channel.send(`Something fishy is going on here!`);
                            old_message.channel.send(`You aren't qualified to hand out this role to them.`);
                        }
                    } else {
                        old_message.channel.send('Please specify a user and role to add');
                        old_message.channel.send(`Example: ${'```'}\n${discord_command} @user#0001 ROLE_HERE${'```'}`);
                    }
                } else if ([`${cp}takerole`].includes(discord_command)) {
                    if (!isWorthyOfAdminCommands) {sendNotAllowedCommand(old_message); return;}
                    if (!botHasPerms(old_message, ['MANAGE_ROLES'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    const guildMember = await old_message.guild.members.fetch(user);
                    const role_to_remove = old_message.guild.roles.cache.get(command_args[1]) ?? old_message.mentions.roles.first();
                    if (guildMember && role_to_remove) {
                        const user_is_greater_than_member = old_message.member.roles.highest.comparePositionTo(guildMember.roles.highest) > 0; // DO NOT TOUCH
                        const user_is_greater_than_role_to_remove = old_message.member.roles.highest.comparePositionTo(role_to_remove) >= 0; // DO NOT TOUCH
                        if (user_is_greater_than_member && user_is_greater_than_role_to_remove) {
                            guildMember.roles.remove(role_to_remove).then(guildMember => {
                                old_message.channel.send(new CustomRichEmbed({
                                    title:`Role Manager`,
                                    description:`Removed ${role_to_remove} from ${guildMember.user.tag}`
                                }, old_message));
                            }).catch(console.warn);
                        } else {
                            old_message.channel.send(`Something fishy is going on here!`);
                            old_message.channel.send(`You aren't qualified to take this role from them.`);
                        }
                    } else {
                        old_message.channel.send('Please specify a user and role to take');
                        old_message.channel.send(`Example: ${'```'}\n${discord_command} @user#0001 ROLE_ID_HERE${'```'}`);
                    }
                } else if ([`${cp}timeout`].includes(discord_command)) {
                    if (!isWorthyOfAdminCommands) {sendNotAllowedCommand(old_message); return;}
                    if (!botHasPerms(old_message, ['MANAGE_MESSAGES'])) return;
                    if (command_args[0] === 'list') {
                        const users_in_timeout = new GuildConfigManipulator(old_message.guild.id).config.users_in_timeout || [];
                        const members_in_timeout = users_in_timeout.map(user_id => client.users.resolve(user_id).tag);
                        old_message.channel.send(new CustomRichEmbed({
                            title:'Here are the users in timeout',
                            description:`${'```'}\n${members_in_timeout.length > 0 ? members_in_timeout.join('\n') : 'Nobody is in timeout'}${'```'}`
                        }, old_message));
                    } else {
                        const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                        if (!user) {
                            old_message.channel.send(new CustomRichEmbed({
                                color:0xFFFF00,
                                title:'Improper Command Usage',
                                description:'Make sure to mention the member that you wish to put into timeout.',
                                fields:[
                                    {name:'Information', value:[
                                        'Putting users in timeout means that their messages sent within the server, will be deleted immediately.',
                                        'Timeouts are indefinite, meaning that you must manually remove someone from timeout.'
                                    ].join('\n')},
                                    {name:`Example`, value:`The following will place / remove someone from timeout${'```'}\n${discord_command} @user#0001${'```'}`},
                                    {name:`Example`, value:`The following will show the users in timeout${'```'}\n${discord_command} list${'```'}`}
                                ]
                            }, old_message));
                            return;
                        }
                        old_message.guild.members.fetch(user.id).then(guildMember => {
                            if (isThisBotsOwner(guildMember.id) || isThisBot(guildMember.id) || guildMember.id === old_message.author.id) {return;}
                            const users_in_timeout = guild_config.users_in_timeout;
                            guild_config_manipulator.modifyConfig({
                                users_in_timeout:(users_in_timeout.includes(guildMember.id) ? [...users_in_timeout.filter(user_id => user_id !== guildMember.id)] : [...users_in_timeout, guildMember.id])
                            }).then(guild_config_manipulator => {
                                if (guild_config_manipulator.config.users_in_timeout.includes(guildMember.id)) {
                                    old_message.channel.send(new CustomRichEmbed({
                                        title:`@${guildMember.user.tag} has been put into timeout!`,
                                        description:`Do this command again to remove them from timeout.`
                                    }));
                                    logAdminCommandsToGuild(old_message, new CustomRichEmbed({title:`@${old_message.author.tag} (${old_message.author.id}) put @${guildMember.user.tag} into timeout!`}));
                                } else {
                                    old_message.channel.send(new CustomRichEmbed({title:`@${guildMember.user.tag} has been removed from timeout!`}));
                                    logAdminCommandsToGuild(old_message, new CustomRichEmbed({title:`@${old_message.author.tag} (${old_message.author.id}) removed @${guildMember.user.tag} from timeout!`}));
                                }
                            });
                        }).catch(error => logUserError(old_message, error));
                    }
                } else if ([`${cp}disconnect`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['MOVE_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(guildMember => {
                        if (isThisBotsOwner(guildMember.id) || isThisBot(guildMember.id) || guildMember.id === old_message.author.id) {return;}
                        if (!guildMember.voice) {return;}
                        guildMember.voice.kick(`@${old_message.author.username} used ${discord_command}`).then(() => {
                            old_message.channel.send(new CustomRichEmbed({title:`@${guildMember.user.tag} has been disconnected!`}));
                            logAdminCommandsToGuild(old_message, new CustomRichEmbed({title:`@${old_message.author.tag} (${old_message.author.id}) disconnected @${guildMember.user.tag} (${guildMember.user.id}) from the their voice channel!`}));
                        });
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}kick`].includes(discord_command)) {
                    if (!botHasPerms(old_message, ['KICK_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.fetch(user.id).then(guildMember => {
                        if (isThisBotsOwner(guildMember.id) || isThisBot(guildMember.id) || guildMember.id === old_message.author.id) {return;}
                        sendConfirmationEmbed(old_message.author.id, old_message.channel.id, true, new CustomRichEmbed({title:`Are you sure you want to kick @${guildMember.user.tag}?`}), () => {
                            const _kickMember = () => {
                                guildMember.kick(`@${old_message.author.username} used ${discord_command}`).then(() => {
                                    old_message.channel.send(new CustomRichEmbed({title:`@${guildMember.user.tag} has been kicked!`}));
                                    logAdminCommandsToGuild(old_message, new CustomRichEmbed({title:`@${old_message.author.tag} (${old_message.author.id}) kicked @${guildMember.user.tag} (${guildMember.user.id}) from the server!`}));
                                });
                            };
                            guildMember.createDM().then(dmChannel => {
                                dmChannel.send(`You have been kicked from ${old_message.guild.name}`).then(() => {
                                    _kickMember();
                                }).catch(() => {// Failed to send dm
                                    _kickMember();
                                });
                            }).catch(() => {// Failed to create dm channel
                                _kickMember();
                            });
                        }, () => {});
                    }).catch(error => logUserError(old_message, error));
                } else if ([`${cp}ban`].includes(discord_command)) {
                    if (!isWorthyOfAdminCommands) {sendNotAllowedCommand(old_message); return;}
                    if (!botHasPerms(old_message, ['BAN_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    if (isThisBotsOwner(user.id) || isThisBot(user.id) || user.id === old_message.author.id) {return;}
                    sendConfirmationEmbed(old_message.author.id, old_message.channel.id, true, new CustomRichEmbed({title:`Are you sure you want to ban @${user.tag}?`}), async () => {
                        function _banMember() {
                            let user_was_banned = true;
                            try {
                                if (isSuperPerson(user.id)) throw new Error(`Unable to ban an ${bot_common_name} Super Person!`);
                                old_message.guild.members.ban(user.id, {reason:`@${old_message.author.tag} used ${discord_command}`});
                            } catch (error) {
                                user_was_banned = false;
                                logUserError(old_message, error);
                            } finally {
                                if (!user_was_banned) return;
                                old_message.channel.send(new CustomRichEmbed({title:`@${user.tag} has been banned!`}));
                                logAdminCommandsToGuild(old_message, new CustomRichEmbed({title:`@${old_message.author.tag} (${old_message.author.id}) banned @${user.tag} (${user.id}) from the server!`}));
                            }
                        }
                        try {
                            if (!old_message.guild.members.resolve(user.id)) throw new Error('User does not exist in Guild!');
                            const dm_channel = await user.createDM();
                            const appeals_guild_invite = await generateInviteToGuild(bot_appeals_guild_id, `Generated using ${discord_command} in ${old_message.guild.name} (${old_message.guild.id})`);
                            dm_channel.send(new CustomRichEmbed({
                                color:0xFF00FF,
                                title:`You have been banned from ${old_message.guild.name}`,
                                description:[
                                    `You may have a second chance via the [${bot_common_name} Appeals Server](${appeals_guild_invite.url})`,
                                    `If **${old_message.guild.name}** has ${bot_short_name} Appeals enabled, then you can send an apology to them using the **${bot_common_name} Appeals Server**.`
                                ].join('\n')
                            }));
                        } catch (error) {
                            console.error(error);
                            logUserError(old_message, error);
                        } finally {
                            _banMember();
                        }
                    }, () => {});
                } else if ([`${cp}unban`].includes(discord_command)) {
                    if (!isWorthyOfAdminCommands) {sendNotAllowedCommand(old_message); return;}
                    if (!botHasPerms(old_message, ['BAN_MEMBERS'])) return;
                    const user = client.users.resolve(command_args[0]) ?? old_message.mentions.users.first();
                    if (!user) {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:'Provide a @user next time!'
                        }, old_message));
                        return;
                    }
                    old_message.guild.members.unban(user, `@${old_message.author.tag} used the ${discord_command} command!`).then(unbanned_user => {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`@${unbanned_user.tag} (${unbanned_user.id}) has been unbanned!`
                        }, old_message));
                    }).catch(() => {
                        old_message.channel.send(new CustomRichEmbed({
                            color:0xFFFF00,
                            title:`An error has occurred!`,
                            description:`I'm unable to unban that user!`
                        }, old_message));
                    });
                } else if ([`${cp}bans`].includes(discord_command)) {
                    const guild_bans = await old_message.guild.fetchBans();
                    const page_fields = guild_bans.map(guild_ban => {
                        return {
                            name:`Ban Record`,
                            value:[
                                `${'```'}\n`,
                                `User: ${guild_ban.user.tag} (${guild_ban.user.id})`,
                                `Reason: ${guild_ban.reason ?? 'N/A'}`,
                                `\n${'```'}`
                            ].join('\n')
                        };
                    });
                    const pages = array_chunks(page_fields, 10);
                    let page_index = 0;
                    function makeEmbed() {
                        return new CustomRichEmbed({
                            title:`Here are the bans in this guild, 10 at a time!`,
                            description:`Page — ${constructNumberUsingEmoji(page_index + 1)} / ${constructNumberUsingEmoji(pages.length)}`,
                            fields:pages[page_index]
                        }, old_message);
                    }
                    sendOptionsMessage(old_message.channel.id, makeEmbed(), [
                        {
                            emoji_name:'bot_emoji_angle_left',
                            callback:(options_message, collected_reaction, user) => {
                                removeUserReactionsFromMessage(options_message);
                                page_index--;
                                if (page_index < 0) {page_index = pages.length-1;}
                                options_message.edit(makeEmbed());
                            }
                        }, {
                            emoji_name:'bot_emoji_angle_right',
                            callback:(options_message, collected_reaction, user) => {
                                removeUserReactionsFromMessage(options_message);
                                page_index++;
                                if (page_index > pages.length-1) {page_index = 0;}
                                options_message.edit(makeEmbed());
                            }
                        }
                    ]);
                }
            }
        } else if (serverSettingsCommands.includes(discord_command)) {
            if (!(old_message.member.hasPermission('ADMINISTRATOR') || isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'guild_admin') || isThisBotsOwner(old_message.member.id))) {
                sendNotAllowedCommand(old_message);
                return;
            }
            logAdminCommandsToGuild(old_message);
            if ([`${cp}create_special_channels`].includes(discord_command)) {
                if (!botHasPerms(old_message, ['MANAGE_CHANNELS'])) return;
                const embed = new CustomRichEmbed({
                    title:'Do you want to create the following channels automatically!',
                    description:`These channels are used for various logs generated by ${bot_common_name}!`,
                    fields:[
                        {name:'Category Channel', value:`${bot_special_channels_category_name}`},
                        {name:'Text Channels', value:`${bot_special_text_channels.join('\n')}`}
                    ]
                });
                sendConfirmationEmbed(old_message.author.id, old_message.channel.id, true, embed, async () => {
                    let success = true;
                    const bot_message = await old_message.channel.send(new CustomRichEmbed({title:`Creating \`${bot_special_channels_category_name}\``}));
                    try {
                        const created_category = await old_message.guild.channels.create(`${bot_special_channels_category_name}`, {type:'category'});
                        await util.Timer(2000);
                        for (let special_text_channel_name of bot_special_text_channels) {
                            await util.Timer(1000);
                            await bot_message.edit(new CustomRichEmbed({title:`Creating \`${special_text_channel_name}\``}));
                            const created_channel = await old_message.guild.channels.create(`${special_text_channel_name}`, {type:'text'});
                            await created_channel.setParent(created_category);
                            await util.Timer(1000);
                        }
                        await util.Timer(2000);
                    } catch {
                        success = false;
                    } finally {
                        if (success) bot_message.edit(new CustomRichEmbed({color:0x00FF00, title:`Successfully Finished Creating Channels!`}));
                        else bot_message.edit(new CustomRichEmbed({color:0xFFFF00, title:`Failed When Creating Channels!`}));
                    }
                }, () => {
                    old_message.channel.send(new CustomRichEmbed({title:'Canceled Creating Channels!'}));
                });
            } else if ([`${cp}toggle_command_message_removal`].includes(discord_command)) {
                const command_message_removal = guild_config.command_message_removal === 'enabled';
                if (command_message_removal === true) {
                    old_message.channel.send(`Command Message Removal: disabled; When a user uses a command, the user's message will not be removed.`);
                    guild_config_manipulator.modifyConfig({command_message_removal:'disabled'});
                } else {
                    old_message.channel.send(`Command Message Removal: enabled; When a user uses a command, the user's message will be removed.`);
                    guild_config_manipulator.modifyConfig({command_message_removal:'enabled'});
                }
            } else if ([`${cp}toggle_clear_message`].includes(discord_command)) {
                const clear_message = guild_config.clear_message === 'enabled';
                if (clear_message === true) {
                    old_message.channel.send(`Clear Message: disabled; \`${cp}clear\` will not say when it has been used.`);
                    guild_config_manipulator.modifyConfig({clear_message:'disabled'});
                } else {
                    old_message.channel.send(`Clear Message: enabled; \`${cp}clear\` will say when it has been used.`);
                    guild_config_manipulator.modifyConfig({clear_message:'enabled'});
                }
            } else if ([`${cp}toggle_player_description`].includes(discord_command)) {
                const player_description = guild_config.player_description === 'enabled';
                if (player_description === true) {
                    old_message.channel.send(`Player Description: disabled; Youtube player descriptions will not be expanded by default.`);
                    guild_config_manipulator.modifyConfig({player_description:'disabled'});
                } else {
                    old_message.channel.send(`Player Description: enabled; Youtube player descriptions will be expanded by default.`);
                    guild_config_manipulator.modifyConfig({player_description:'enabled'});
                }
            } else if ([`${cp}toggle_invite_blocking`].includes(discord_command)) {
                const invite_blocking = guild_config.invite_blocking === 'enabled';
                if (invite_blocking === true) {
                    old_message.channel.send(`Invite Blocking: disabled; Invites sent by members sent in the server will not be automatically deleted.`);
                    guild_config_manipulator.modifyConfig({invite_blocking:'disabled'});
                } else {
                    old_message.channel.send(`Invite Blocking: enabled; Invites sent by members sent in the server will be automatically deleted.`);
                    guild_config_manipulator.modifyConfig({invite_blocking:'enabled'});
                }
            } else if ([`${cp}toggle_url_blocking`].includes(discord_command)) {
                const url_blocking = guild_config.url_blocking === 'enabled';
                if (url_blocking === true) {
                    old_message.channel.send(`URL Blocking: disabled; URLs sent by members sent in the server will not be automatically deleted.`);
                    guild_config_manipulator.modifyConfig({url_blocking:'disabled'});
                } else {
                    old_message.channel.send(`URL Blocking: enabled; URLs sent by members sent in the server will be automatically deleted.`);
                    guild_config_manipulator.modifyConfig({url_blocking:'enabled'});
                }
            } else if ([`${cp}set_volume_maximum`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (command_args[0]) {
                    const old_volume_maximum = guild_config.volume_maximum ?? 100;
                    const new_volume_maximum = !isNaN(parseFloat(command_args[0])) ? parseFloat(command_args[0]) : 100;
                    if (new_volume_maximum >= 100) {
                        old_message.channel.send(new CustomRichEmbed({
                            title:`Setting New Maximum Volume`,
                            description:`Old Server Maximum Volume: ${'```'}\n${old_volume_maximum}${'```'}\nNew Server Maximum Volume: ${'```'}\n${new_volume_maximum}${'```'}`
                        }, old_message));
                        guild_config_manipulator.modifyConfig({volume_maximum:new_volume_maximum});
                        server.volume_manager.setVolume(server.volume_manager.last_volume);
                    } else {
                        old_message.channel.send(`Please provide a number greater than or equal to \`100\` next time!`);
                    }
                } else {
                    old_message.channel.send(`Please provide a number after the command next time!`);
                    old_message.channel.send(`Examples:${'```'}${discord_command} 100${'```'}${'```'}${discord_command} 250${'```'}${'```'}${discord_command} 500${'```'}`);
                }
            } else if ([`${cp}set_volume_multiplier`].includes(discord_command)) {
                const server = servers[old_message.guild.id];
                if (command_args[0]) {
                    const old_volume_multiplier = guild_config.volume_multiplier ?? 1;
                    const new_volume_multiplier = !isNaN(parseFloat(command_args[0])) ? parseFloat(command_args[0]) : 1;
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting New Volume Multiplier`,
                        description:`Old Server Volume Multiplier: ${'```'}\n${old_volume_multiplier}${'```'}\nNew Server Volume Multiplier: ${'```'}\n${new_volume_multiplier}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({volume_multiplier:new_volume_multiplier});
                    server.volume_manager.setVolume(server.volume_manager.last_volume);
                } else {
                    old_message.channel.send(`Please provide a number after the command next time!`);
                    old_message.channel.send(`Examples:${'```'}${discord_command} 0.5${'```'}${'```'}${discord_command} 1${'```'}${'```'}${discord_command} 2.0${'```'}`);
                }
            } else if ([`${cp}set_ibm_tts_language`].includes(discord_command)) {
                if (command_args[0]) {
                    const old_tts_language = guild_config.tts_voice_ibm;
                    const new_tts_language = command_args[0];
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting New IBM TTS Language`,
                        description:`Old Server IBM TTS Language: ${'```'}\n${old_tts_language}${'```'}\nNew Server IBM TTS Language: ${'```'}\n${new_tts_language}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({tts_voice_ibm:new_tts_language});
                } else {
                    old_message.channel.send(`Please provide a new ibm_tts_language after the command next time!`);
                    old_message.channel.send(`Example: ${'```'}${discord_command} en-US_EmilyV3Voice${'```'}`);
                    old_message.channel.send(`Use command \`${cp}langcodes ibm\` for a list of supported voices!`);
                }
            } else if ([`${cp}set_google_tts_language`].includes(discord_command)) {
                if (command_args[0]) {
                    const old_tts_language = guild_config.tts_voice_google;
                    const new_tts_language = command_args[0];
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting New Google TTS Language`,
                        description:`Old Server Google TTS Language: ${'```'}\n${old_tts_language}${'```'}\nNew Server Google TTS Language: ${'```'}\n${new_tts_language}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({tts_voice_google:new_tts_language});
                } else {
                    old_message.channel.send(`Please provide a new google_tts_language after the command next time!`);
                    old_message.channel.send(`Example: ${'```'}${discord_command} en-us${'```'}`);
                    old_message.channel.send(`Use command \`${cp}langcodes google\` for a list of supported voices!`);
                }
            } else if ([`${cp}set_admin_roles`].includes(discord_command)) {
                const message_mentions = [...old_message.mentions.roles.values()];
                if (message_mentions.length > 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting New Server Admin Roles`,
                        description:`New Server Admin Roles: ${'```'}\n${message_mentions.map(role => role.name).join('\n')}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({admin_roles:message_mentions.map(role => role.id)});
                } else {
                    old_message.channel.send(`Please provide server admin roles after the command next time!`);
                    old_message.channel.send(`Example: ${'```'}${discord_command} @role1 @role2 @role3${'```'}`);
                }
            } else if ([`${cp}set_moderator_roles`].includes(discord_command)) {
                const message_mentions = [...old_message.mentions.roles.values()];
                if (message_mentions.length > 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting New Server Moderator Roles`,
                        description:`New Server Moderator Roles: ${'```'}\n${message_mentions.map(role => role.name).join('\n')}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({moderator_roles:message_mentions.map(role => role.id)});
                } else {
                    old_message.channel.send(`Please provide server moderator roles after the command next time!`);
                    old_message.channel.send(`Example: ${'```'}${discord_command} @role1 @role2 @role3${'```'}`);
                }
            } else if ([`${cp}set_new_member_roles`].includes(discord_command)) {
                const role_mentions = old_message.mentions.roles;
                if (role_mentions.size > 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting Automatic Roles For New Members`,
                        description:`New Automatic Roles: ${'```'}\n${role_mentions.map(role => role.name).join('\n')}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({new_member_roles:role_mentions.map(role => role.id)});
                } else if (command_args[0] === 'reset') {
                    guild_config_manipulator.modifyConfig({new_member_roles:[]});
                    old_message.channel.send(new CustomRichEmbed({title:`Success: removed all automatic roles for new users!`}, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        description:'Please provide roles to be given to new members after the command next time!',
                        fields:[
                            {name:'Example', value:`${'```'}\n${discord_command} @role1 @role2 @role3\n${'```'}`},
                            {name:'Resetting back to default', value:`You can always run \`${discord_command} reset\` to reset this setting!`},
                            {name:'Information', value:`When setting auto roles, make sure that ${bot_common_name} has \`ADMINISTRATOR\` perms and it's role is dragged above the roles you want it to add to the user.`}
                        ]
                    }));
                }
            } else if ([`${cp}set_allowed_channels`].includes(discord_command)) {
                const message_mentions = [...old_message.mentions.channels.values()];
                if (message_mentions.length > 0) {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Setting New Allowed Channels`,
                        description:`New Server Allowed Channels: ${'```'}\n${message_mentions.map(channel => channel.name).join('\n')}${'```'}`,
                        fields:[
                            {name:'Notice', value:`You can always run ${bot_common_name} commands from \`#${bot_backup_commands_channel_name}\``},
                            {name:'Resetting back to default', value:`You can always run \`${discord_command} reset\` in \`#${bot_backup_commands_channel_name}\` to reset this setting!`}
                        ]
                    }, old_message));
                    guild_config_manipulator.modifyConfig({allowed_channels:message_mentions.map(channel => channel.id)});
                } else if (command_args[0] === 'reset') {
                    guild_config_manipulator.modifyConfig({allowed_channels:[]});
                    old_message.channel.send(new CustomRichEmbed({title:`Success: removed all limitations on where ${bot_common_name} can be used!`}, old_message));
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Improper Command Usage!',
                        description:`Please provide text-channel mentions after the command next time!`,
                        fields:[
                            {name:'Example', value:`${'```'}${discord_command} #bot-commands #staff-commands #some-other-channel${'```'}`},
                            {name:'Resetting Back To Default', value:`${'```'}\n${discord_command} reset${'```'}`}
                        ]
                    }, old_message));
                }
            } else if ([`${cp}set_prefix`].includes(discord_command)) {
                if (command_args[0]) {
                    const old_command_prefix = guild_config.command_prefix || cp;
                    const new_command_prefix = command_args[0].replace(/\s/g, '_'); // Replace whitespace with underscores
                    old_message.channel.send(new CustomRichEmbed({
                        title:'Setting New Command Prefix',
                        description:`Old Server Command Prefix: ${'```'}\n${old_command_prefix}${'```'}\nNew Server Command Prefix: ${'```'}${new_command_prefix}${'```'}`
                    }, old_message));
                    guild_config_manipulator.modifyConfig({command_prefix:new_command_prefix});
                } else {
                    old_message.channel.send(new CustomRichEmbed({
                        title:`Well I guess it's time for me to respond to something new!`,
                        description:'Make sure to enter a new command_prefix after the command next time!',
                        fields:[
                            {name:'Example Command Usage', value:`${'```'}\n${discord_command} $${'```'}`},
                            {name:'Example Description', value:`If you run the above command, ${bot_common_name} will start responding to commands using \`$\` instead of \`${cp}\``},
                        ]
                    }));
                }
            }
        } else if ([...botAdminCommands].includes(discord_command) && (isSuperPerson(old_message.member.id) || isThisBotsOwner(old_message.member.id))) {
            if ([`${cp}supercommands`].includes(discord_command)) {
                old_message.author.createDM().then(dmChannel => {
                    dmChannel.send(new CustomRichEmbed({
                        title:`${bot_common_name} - Super Commands`,
                        description:`Here is a list of commands made available to super_people and the bot_owner!\nSome commands require certain permissions!`,
                        fields:[
                            {name:'Server Admin Commands', value:`${'```'}\n${adminCommands.join('\n')}${'```'}`},
                            {name:'Super People Commands', value:`${'```'}\n${botAdminCommands.join('\n')}${'```'}`},
                            {name:'Bot Owner Commands', value:`${'```'}\n${botOwnerCommands.join('\n')}${'```'}`}
                        ]
                    }, old_message));
                }).catch(console.warn);
            } else if ([`${cp}superpeople`].includes(discord_command)) {
                old_message.author.createDM().then(dmChannel => {
                    sendLargeMessage(dmChannel.id, JSON.stringify(super_people, null, 2));
                }).catch(console.warn);
            } else if ([`${cp}superpermissions`].includes(discord_command)) {
                old_message.author.createDM().then(dmChannel => {
                    dmChannel.send(new CustomRichEmbed({
                        title:`${bot_common_name} - Super Permissions`,
                        description:`Here is a list of super permissions you might have!`,
                        fields:[
                            {name:'All Super Permissions', value:`${'```'}\n${super_perms.join('\n')}${'```'}`},
                            {name:'Your Super Permissions', value:`${'```'}\n${super_perms.filter(perm_flag => isSuperPersonAllowed(isSuperPerson(old_message.author.id), perm_flag)).join('\n')}${'```'}`}
                        ]
                    }, old_message));
                }).catch(console.warn);
            } else if ([`${cp}eval`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'evaluate_code') || isThisBotsOwner(old_message.member.id)) {
                    const code_to_run = command_args.join(' ').replace(/\r?\n|\r/g, '').trim(); // Removes line-breaks and trim
                    console.info(`----------------------------------------------------------------------------------------------------------------`);
                    console.info(`Running Code:`, code_to_run);
                    const eval_output = await eval(`${code_to_run.startsWith('await') ? `(async function() {return ${code_to_run};})();` : code_to_run}`);
                    console.info(`Output:`, eval_output);
                    console.info(`----------------------------------------------------------------------------------------------------------------`);
                    const eval_output_string = safe_stringify(eval_output, null, 2);
                    old_message.reply(new CustomRichEmbed({
                        title:'Evaluated Code',
                        fields:[
                            {name:'Input', value:`${'```'}js\n${discord_command} ${code_to_run}\n${'```'}`},
                            {name:'Output', value:`${'```'}js\n${eval_output_string?.length < 1024 ? eval_output_string : `\`Check the console for output!\``}\n${'```'}`}
                        ]
                    }));
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}supervolume`, `${cp}sv`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'super_volume') || isThisBotsOwner(old_message.member.id)) {
                    const voiceChannels = client.voice.connections.map(voiceConnection => voiceConnection.channel);
                    const userVoiceChannel = old_message.member.voice.channel;
                    if (voiceChannels.includes(userVoiceChannel)) {
                        const server = servers[old_message.guild.id];
                        server.dispatcher.setVolume(parseFloat(command_args[0]));
                    }
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}echo`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'echo') || isThisBotsOwner(old_message.member.id)) {
                    old_message.channel.send(message.content.replace(discord_command, '').trim());
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}dm`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'dm') || isThisBotsOwner(old_message.member.id)) {
                    client.users.cache.get(command_args[0]).createDM().then(dmChannel => {
                        dmChannel.send(new CustomRichEmbed({
                            author:{iconURL:old_message.author.displayAvatarURL({dynamic:true}), name:`@${old_message.author.tag} (${old_message.author.id})`},
                            description:`${message.cleanContent.replace(`${discord_command} ${command_args[0]}`, '').trim()}`
                        }));
                    }).catch(console.warn);
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}deletemessage`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'delete_messages') || isThisBotsOwner(old_message.member.id)) {
                    const potential_channel = client.channels.cache.get(command_args[0]);
                    const channel_id_hosting_message = potential_channel?.id ?? old_message.channel.id;
                    const message_id_to_delete = potential_channel ? command_args[1] : command_args[0];
                    if (channel_id_hosting_message && message_id_to_delete) {
                        removeMessageFromChannel(channel_id_hosting_message, message_id_to_delete);
                    } else {
                        old_message.channel.send(`Please do \`${discord_command} channel_id message_id\` for this command!`);
                    }
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}getguilds`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'get_guild') || isThisBotsOwner(old_message.member.id)) {
                    sendLargeMessage(old_message.channel.id, client.guilds.cache.map(guild => `(${guild.id}) ${guild.name}`).join('\n'));
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}getguild`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'get_guild') || isThisBotsOwner(old_message.member.id)) {
                    if (command_args[0]) {
                        const guild = client.guilds.cache.get(command_args[1]) ?? old_message.guild;
                        if (!guild) {return;}
                        switch (command_args[0].toLowerCase()) {
                            case 'roles':
                                old_message.channel.send(`Here are the guild roles for: ${guild.id}`);
                                sendLargeMessage(old_message.channel.id, guild.roles.cache.sort((a, b) => b.position - a.position).map(role => `(${role.id}) (${role.position}) ${role.name}`).join('\n'));
                            break;
                            case 'invites':
                                guild.fetchInvites().then(invites => {
                                    if (invites.size && invites.size > 0) {
                                        old_message.channel.send(`Here are the guild invites for: ${guild.id}`);
                                        sendLargeMessage(old_message.channel.id, invites.map(invite => `(${invite.code}) https://discord.gg/${invite.code}`).join('\n'));
                                    } else {
                                        old_message.channel.send(`Couldn't find any invites for ${guild.name} (${guild.id})`);
                                    }
                                }).catch(console.warn);
                            break;
                            case 'channels':
                                old_message.channel.send(`Here are the guild channels for: ${guild.id}`);
                                sendLargeMessage(old_message.channel.id, guild.channels.cache.map(channel => `(${channel.id}) [${channel.type}] ${channel.name}`).join('\n'));
                            break;
                            case 'managers':
                                old_message.channel.send(`Here are the guild managers for: ${guild.id}`);
                                sendLargeMessage(old_message.channel.id, guild.members.cache.filter(m => !m.user.bot && m.hasPermission(['MANAGE_GUILD'])).sort((a, b) => b.roles.highest.position - a.roles.highest.position).map(member => `(${member.id}) ${member.user.tag}`).join('\n'));
                            break;
                            case 'members':
                                const guild_members = guild.members.cache.filter(m => !m.user.bot);
                                function _output_members() {
                                    old_message.channel.send(`Here are the guild members for: ${guild.id}`);
                                    sendLargeMessage(old_message.channel.id, guild_members.sort((a, b) => b.roles.highest.position - a.roles.highest.position).map(member => `(${member.id}) ${member.user.tag}`).join('\n'));
                                }
                                if (guild_members.size >= 100) {
                                    sendConfirmationEmbed(old_message.author.id, old_message.channel.id, true, new CustomRichEmbed({
                                        title:'There are a lot of members in that guild!',
                                        description:`Do you wish to print out ${guild_members.size} members?`
                                    }, old_message), () => {
                                        _output_members();
                                    });
                                } else {
                                    _output_members();
                                }
                            break;
                            case 'bots':
                                const guild_bots = guild.members.cache.filter(m => m.user.bot);
                                function _output_bots() {
                                    old_message.channel.send(`Here are the guild bots for: ${guild.id}`);
                                    sendLargeMessage(old_message.channel.id, guild_bots.sort((a, b) => b.roles.highest.position - a.roles.highest.position).map(member => `(${member.id}) ${member.user.tag}`).join('\n'));
                                }
                                if (guild_bots.size >= 100) {
                                    sendConfirmationEmbed(old_message.author.id, old_message.channel.id, true, new CustomRichEmbed({
                                        title:'There are a lot of bots in that guild!',
                                        description:`Do you wish to print out ${guild_bots.size} members?`
                                    }, old_message), () => {
                                        _output_bots();
                                    });
                                } else {
                                    _output_bots();
                                }
                            break;
                            case 'config':
                                sendLargeMessage(old_message.channel.id, `${JSON.stringify(guild_config, null, 2)}`, 'json');
                            break;
                            case 'usage':
                                function getGuildCommandsUsage(guild_id) {
                                    const current_command_logs = JSON.parse(fs.readFileSync(bot_command_log_file.replace('#{date}', `${moment().format(`YYYY_MM`)}`)));
                                    const guild_command_usage = current_command_logs.filter(command_log_entry => command_log_entry.guild.indexOf(guild_id) > -1).length;
                                    return guild_command_usage;
                                }
                                old_message.channel.send(`Command usage for \`${guild.name}\` is \`${getGuildCommandsUsage(guild.id)}\` entered this month!`);
                            break;
                        }
                    } else {
                        old_message.channel.send(`Usage: ${'```'}\n${discord_command} [ roles | invites | channels | managers | members | bots | usage | config ] GUILD_ID_HERE${'```'}`);
                    }
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}blacklist`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'blacklist') || isThisBotsOwner(old_message.member.id)) {
                    if (command_args[0] === 'user') {
                        const user = client.users.cache.get(command_args[1]) || [...old_message.mentions.users.values()][0];
                        const blacklist_reason = command_args.slice(2).join(' ') || 'Unknown Reason';
                        if (!user) {return;}
                        if (isThisBotsOwner(user.id)) {return;} // Don't blacklist the bot owner
                        let blacklisted_users = JSON.parse(fs.readFileSync(bot_blacklisted_users_file));
                        if (blacklisted_users.map(blacklisted_user => blacklisted_user.id).includes(user.id)) {// Remove user from the blacklist
                            blacklisted_users = blacklisted_users.filter(blacklisted_user => blacklisted_user.id !== user.id);
                            old_message.channel.send(new CustomRichEmbed({
                                description:`Removed [${user.tag}] (${user.id}) from blacklist!`
                            }));
                        } else {// Add user to the blacklist
                            blacklisted_users = [
                                ...blacklisted_users,
                                {
                                    id:user.id,
                                    name:user.tag,
                                    reason:blacklist_reason
                                }
                            ];
                            old_message.channel.send(new CustomRichEmbed({
                                description:`Blacklisted User [${user.tag}] (${user.id}) for ${blacklist_reason}`
                            }));
                        }
                        fs.writeFileSync(bot_blacklisted_users_file, JSON.stringify(blacklisted_users, null, 4));
                    } else if (command_args[0] === 'guild') {
                        const guild = client.guilds.cache.get(command_args[1]);
                        const blacklist_reason = command_args.slice(2).join(' ') || 'Unknown Reason';
                        if (!guild) {return;}
                        let blacklisted_guilds = JSON.parse(fs.readFileSync(bot_blacklisted_guilds_file));
                        if (blacklisted_guilds.map(blacklisted_guild => blacklisted_guild.id).includes(guild.id)) {// Remove guild from the blacklist
                            blacklisted_guilds = blacklisted_guilds.filter(blacklisted_guild => blacklisted_guild.id !== guild.id);
                            old_message.channel.send(new CustomRichEmbed({
                                description:`Removed [${guild.name}] (${guild.id}) from blacklist!`
                            }));
                        } else {// Add guild to the blacklist
                            blacklisted_guilds = [
                                ...blacklisted_guilds,
                                {
                                    id:guild.id,
                                    name:guild.name,
                                    reason:blacklist_reason
                                }
                            ];
                            old_message.channel.send(new CustomRichEmbed({
                                description:`Blacklisted Guild [${guild.name}] (${guild.id}) for ${blacklist_reason}`
                            }));
                        }
                        fs.writeFileSync(bot_blacklisted_guilds_file, JSON.stringify(blacklisted_guilds, null, 4));
                    } else {
                        old_message.channel.send(new CustomRichEmbed({
                            description:`Command Usage: ${'```'}\n${discord_command} [ user | guild ] ID_HERE${'```'}`
                        }));
                    }
                } else {
                    sendNotAllowedCommand(old_message);
                }
            } else if ([`${cp}restart`].includes(discord_command)) {
                if (isSuperPersonAllowed(isSuperPerson(old_message.member.id), 'restart') || isThisBotsOwner(old_message.member.id)) {
                    const num_active_voices = client.voice?.connections?.size;
                    const active_voice_guilds = client.voice?.connections?.map(connection => connection.channel.guild);
                    sendConfirmationEmbed(old_message.author.id, old_message.channel.id, false, new CustomRichEmbed({
                        title:`Do you want to restart ${bot_common_name}`,
                        description:`${num_active_voices > 0 ? '```fix\n' : ''}There ${num_active_voices === 1 ? 'is' : 'are'} ${num_active_voices} active voice connection${num_active_voices === 1 ? '' : 's'} right now.${num_active_voices > 0 ? '\n```' : ''}`,
                        fields:[
                            {name:'Affected Guilds', value:(active_voice_guilds.length > 0 ? `${'```'}\n${active_voice_guilds.map(guild => `${guild.me.voice.channel.members.filter(member => !member.user.bot).size} - ${guild.name}`).join('\n')}\n${'```'}` : 'N/A')}
                        ]
                    }), async (bot_message) => {
                        util.restarting_bot = true;
                        console.warn(`@${old_message.author.tag} (${old_message.author.id}) restarted ${bot_common_name}!`);
                        const voice_channels = client.voice.connections?.map(c => c.channel) ?? [];
                        if (voice_channels.length > 0) {
                            await bot_message.edit(new CustomRichEmbed({title:`${bot_common_name}: SENDING RESTART TTS`}));
                            const tts_text_english = `My developer told me to restart for updates... Check back in 5 minutes to see if I'm finished updating.`;
                            const tts_url_english = `${bot_api_url}/speech?type=ibm&lang=en-GB_KateV3Voice&text=${encodeURI(tts_text_english)}`;
                            const tts_broadcast_english = client.voice.createBroadcast();
                            tts_broadcast_english.play(tts_url_english);
                            for (let vc of voice_channels) {
                                if (!vc) return;
                                playStream(await createConnection(vc, true), tts_broadcast_english, 250);
                            }
                            await util.Timer(10000); // Let TTS do its thing first

                            const tts_text_spanish = `Mi desarrollador me dijo que reiniciara las actualizaciones ... Vuelva en 5 minutos para ver si he terminado de actualizar.`;
                            const tts_url_spanish = `${bot_api_url}/speech?type=ibm&lang=es-LA_SofiaV3Voice&text=${encodeURI(tts_text_spanish)}`;
                            const tts_broadcast_spanish = client.voice.createBroadcast();
                            tts_broadcast_spanish.play(tts_url_spanish);
                            for (let vc of voice_channels) {
                                if (!vc) return;
                                playStream(await createConnection(vc, false), tts_broadcast_spanish, 250);
                            }
                            await util.Timer(15000); // Let TTS do its thing first

                            const tts_text_german = `Mein Entwickler sagte mir, ich solle für Updates neu starten ... Überprüfen Sie in 5 Minuten erneut, ob ich mit dem Update fertig bin.`;
                            const tts_url_german = `${bot_api_url}/speech?type=ibm&lang=de-DE_DieterV3Voice&text=${encodeURI(tts_text_german)}`;
                            const tts_broadcast_german = client.voice.createBroadcast();
                            tts_broadcast_german.play(tts_url_german);
                            for (let vc of voice_channels) {
                                if (!vc) return;
                                playStream(await createConnection(vc, false), tts_broadcast_german, 250);
                            }
                            await util.Timer(13000); // Let TTS do its thing first

                            const tts_text_japanese = `開発者からアップデートを再開するように言われました... 5分後にもう一度チェックして、アップデートが終了したかどうかを確認してください。`;
                            const tts_url_japanese = `${bot_api_url}/speech?type=ibm&lang=ja-JP_EmiV3Voice&text=${encodeURI(tts_text_japanese)}`;
                            const tts_broadcast_japanese = client.voice.createBroadcast();
                            tts_broadcast_japanese.play(tts_url_japanese);
                            for (let vc of voice_channels) {
                                if (!vc) return;
                                playStream(await createConnection(vc, false), tts_broadcast_japanese, 250);
                            }
                            await util.Timer(25000); // Let TTS do its thing first
                        }
                        await bot_message.edit(new CustomRichEmbed({title:`${bot_common_name}: RESTARTED`}));
                        await util.Timer(500);
                        process.exit(1); // Restart Bot
                    }, async (bot_message) => {
                        await bot_message.reactions.removeAll();
                        bot_message.edit(new CustomRichEmbed({title:`Canceled Restarting ${bot_common_name}`}));
                    });
                } else {
                    sendNotAllowedCommand(old_message);
                }
            }
        } else if ([...botOwnerCommands].includes(discord_command) && isThisBotsOwner(old_message.member.id)) {// Only allow the bot owner to use
            if ([`${cp}updatelog`].includes(discord_command)) {
                const update_message_embed = new CustomRichEmbed({
                    title:`${bot_common_name} - Update Notification`,
                    description:`${old_message.content.replace(discord_command, '').trim()}`
                });
                old_message.channel.send(update_message_embed);
                sendConfirmationEmbed(old_message.author.id, old_message.channel.id, false, new CustomRichEmbed({
                    title:'Are you sure you want to send the update message above?'
                }), (bot_message) => {
                    //#region Update Log Logging
                    const old_updates_log = JSON.parse(fs.readFileSync(bot_update_log_file));
                    const update_log_entry = {
                        timestamp:`${moment()}`,
                        embed:update_message_embed.toJSON()
                    };
                    const new_updates_log = [...old_updates_log, update_log_entry];
                    fs.writeFileSync(bot_update_log_file, JSON.stringify(new_updates_log, null, 2));
                    //#endregion Update Log Logging

                    const update_log_channels = client.channels.cache.filter(channel => channel.name === bot_update_log_channel_name);
                    bot_message.edit(new CustomRichEmbed({title:`Attempted Sending Update Messsage To ${update_log_channels.size} Guilds!`})).then(() => {
                        let index = 0;
                        for (let update_log_channel of update_log_channels.values()) {
                            if (update_log_channel.permissionsFor(update_log_channel.guild.me).has('SEND_MESSAGES')) {
                                client.setTimeout(() => {
                                    console.info(`Sent update log to ${update_log_channel.guild.name} (${update_log_channel.guild.id})`);
                                    update_log_channel.send(update_message_embed);
                                }, 2500 * index);
                            }
                            index++;
                        }
                    });
                }, (bot_message) => {
                    bot_message.edit(new CustomRichEmbed({title:'Canceled Sending Update Message!'}));
                });
            } else if ([`${cp}lockdown`].includes(discord_command)) {
                if (['guild', 'server'].includes(command_args[0])) {
                    const guild = client.guilds.cache.get(command_args[0]) ?? old_message.guild;
                    const server = servers[guild.id];
                    server.lockdown_mode = !server.lockdown_mode;
                    old_message.channel.send(new CustomRichEmbed({title:`Guild ${guild.name} (${guild.id}) Lockdown Mode: ${server.lockdown_mode ? 'Enabled' : 'Disabled'}`}));
                } else {
                    util.lockdown_mode = !util.lockdown_mode;
                    old_message.channel.send(new CustomRichEmbed({title:`Lockdown Mode: ${util.lockdown_mode ? 'Enabled' : 'Disabled'}`}));
                }
            } else if ([`${cp}leaveguild`].includes(discord_command)) {
                client.guilds.cache.get(command_args[0])?.leave();
            }
        } else {// The rest are unlisted commands
            if (d2MemeCommands.includes(discord_command)) {
                if ([`${cp}shaxx`].includes(discord_command)) {
                    playLocalMP3s(old_message, './files/__mp3s/d2_shaxx_voice_lines/');
                } else if ([`${cp}failsafe`].includes(discord_command)) {
                    playLocalMP3s(old_message, './files/__mp3s/d2_failsafe_voice_lines/');
                } else if ([`${cp}caydesix`].includes(discord_command)) {
                    playLocalMP3s(old_message, './files/__mp3s/d2_cayde_six_voice_lines/');
                } else if ([`${cp}rasputin`].includes(discord_command)) {
                    playLocalMP3s(old_message, './files/__mp3s/d2_rasputin_voice_lines/');
                } else if ([`${cp}ghost`].includes(discord_command)) {
                    playLocalMP3s(old_message, './files/__mp3s/d2_ghost_voice_lines/');
                } else if ([`${cp}zavala`].includes(discord_command)) {
                    playLocalMP3s(old_message, './files/__mp3s/d2_zavala_voice_lines/');
                }
            } else if ([`${cp}tombstone`].includes(discord_command)) {
                servers[old_message.guild.id].audio_controller.disconnect();
                playYouTube(old_message, 'https://youtu.be/4px-kre_BNc', true);
            } else if ([`${cp}normies`, `${cp}fuckingnormies`, `${cp}fucking_normies`].includes(discord_command)) {
                servers[old_message.guild.id].audio_controller.disconnect();
                playYouTube(old_message, 'https://youtu.be/WWiRwIw_hFA', true);
            } else if ([`${cp}stupid`].includes(discord_command)) {
                servers[old_message.guild.id].audio_controller.disconnect();
                playYouTube(old_message, 'https://youtu.be/5hfYJsQAhl0', true);
            } else if ([`${cp}wtf`].includes(discord_command)) {
                servers[old_message.guild.id].audio_controller.disconnect();
                playYouTube(old_message, 'https://youtu.be/yb4QK_lKKEM', true);
            } else if ([`${cp}funny`].includes(discord_command)) {
                servers[old_message.guild.id].audio_controller.disconnect();
                playYouTube(old_message, 'https://youtu.be/FAd2_gdkg-8', true);
            } else if ([`${cp}perkacola`].includes(discord_command)) {
                servers[old_message.guild.id].audio_controller.disconnect();
                playYouTube(old_message, 'https://youtu.be/1J0VZA3N1F8', true);
            } else if ([`${cp}unlimitedpower`, `${cp}unlimited_power`].includes(discord_command)) {
                old_message.channel.send(new CustomRichEmbed({image:`${bot_cdn_url}/unlimted_power.gif`}, old_message));
            } else if ([`${cp}invokeban`].includes(discord_command)) {
                if (isThisBotsOwner(old_message.author.id) && old_message?.member?.voice?.channel) {
                    await old_message.channel.send(new CustomRichEmbed({
                        description:`Banning ${old_message.mentions.users.first() ?? old_message.author}`,
                        image:`${bot_cdn_url}/Invoke-ban_Fairy-Tail.gif`
                    }));
                    playStream(await createConnection(old_message.member.voice.channel, true), `./files/__mp3s/fairy_law.mp3`, 200);
                }
            } else if ([`${cp}ibmtts`, `${cp}googletts`].includes(discord_command)) {
                const command = DisBotCommander.commands.find(cmd => cmd.aliases.includes(discord_command_without_prefix));
                command.execute(client, old_message, {command_prefix:`${cp}`});
            } else if ([`${cp}test`].includes(discord_command)) {
                if (isSuperPerson(old_message.author.id)) {
                    const command = DisBotCommander.commands.find(cmd => cmd.aliases.includes(discord_command_without_prefix));
                    command.execute(client, old_message, {command_prefix:`${cp}`});
                }
            } else {
                old_message.channel.send(new CustomRichEmbed({
                    title:`That command doesn't exist!`,
                    description:`Try \`${cp}help\` for a list of commands!\n\nIf \`${cp}\` is being used by another bot, use the command below to change ${bot_common_name} command prefix!`,
                    fields:[
                        {name:`How to change ${bot_common_name} command prefix`, value:`\`\`\`${cp}set_prefix NEW_PREFIX_HERE\`\`\``}
                    ]
                }, old_message));
            }
        }
    }
});

//------------------------------------------------------------------------------//

/** @todo make all commands work like this */
//#region Register all commands
try {
    const command_files = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    for (const command_file of command_files) {
        const command_to_register = require(`./commands/${command_file}`);
        DisBotCommander.registerCommand(command_to_register);
    }
} catch (error) {
    console.trace(error);
}
//#endregion Register all commands

//------------------------------------------------------------------------------//

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
