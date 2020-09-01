'use strict';

const nodeEmoji = require('node-emoji');

const bot_config = require('../../config.json');

const { Timer,
        getReadableTime } = require('../utilities.js');

const { disBotServers } = require('../SHARED_VARIABLES.js');

const { client } = require('./bot.js');

const { GuildConfigManipulator } = require('./GuildConfig.js');
const { CustomRichEmbed } = require('./CustomRichEmbed.js');
const { findCustomEmoji,
        constructNumberUsingEmoji } = require('./emoji.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_cdn_url = process.env.BOT_CDN_URL;

//---------------------------------------------------------------------------------------------------------------//

/**
 * Breaks apart a large_message and sends it in chunks to a specified channel
 * @param {String} channel_id 
 * @param {String} large_message 
 * @param {String} code_block_lang 
 * @returns {Promise<Array<Message>>} a promise for an array of discord messages
 */
async function sendLargeMessage(channel_id, large_message, code_block_lang='') {
    let sent_messages = [];
    const message_chunks = `${large_message}`.match(/[^]{1,1500}/g); // Split the message into 1500 character long chunks
    for (const message_chunk of message_chunks) {
        let sent_message;
        try {
            sent_message = await client.channels.cache.get(channel_id).send(`${'```'}${code_block_lang}\n${message_chunk}\n${'```'}`);
        } catch (error) {
            console.warn(error);
        } finally {
            sent_messages.push(sent_message);
            await Timer(1000);
        }
    }
    return sent_messages;
}

/**
 * Sends an embed with buttons for the user to click on
 * @param {String} confirm_user_id 
 * @param {String} channel_id 
 * @param {Boolean} delete_after_selection 
 * @param {String|MessageEmbed} embed_contents 
 * @param {Function} yes_callback 
 * @param {Function} no_callback 
 */
function sendConfirmationEmbed(confirm_user_id, channel_id, delete_after_selection=true, embed_contents='Default Embed', yes_callback=(discord_embed)=>{}, no_callback=(discord_embed)=>{}) {
    client.channels.cache.get(channel_id).send(embed_contents).then(async discord_embed => {
        if (!discord_embed) {return;}
        const bot_emoji_checkmark = findCustomEmoji('bot_emoji_checkmark');
        const bot_emoji_close = findCustomEmoji('bot_emoji_close');
        await discord_embed.react(bot_emoji_checkmark);
        await discord_embed.react(bot_emoji_close);
        discord_embed.createReactionCollector(filter => true).on('collect', reaction => {
            if (reaction.users.cache.get(confirm_user_id) && reaction.users.cache.filter(user => !user.bot).size > 0) {
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

const options_message_reactions_template = [
    {
        emoji_name: 'bot_emoji_checkmark',
        cooldown: 1500,
        callback(options_message, collected_reaction, user) {}
    }, {
        emoji_name: 'bot_emoji_close',
        cooldown: 1500,
        callback(options_message, collected_reaction, user) {}
    }
];
/**
 * 
 * @param {String} channel_id 
 * @param {MessageEmbed} embed 
 * @param {options_message_reactions_template} reaction_options 
 * @param {String} confirmation_user_id 
 * @returns {Message} options_message after attempting to add all reactions
 */
async function sendOptionsMessage(channel_id, embed, reaction_options=options_message_reactions_template, confirmation_user_id=undefined) {
    const options_message = await client.channels.cache.get(channel_id).send(embed).catch(console.warn);
    if (!options_message) throw new Error(`Unable to send options_message!`);

    for (const reaction_option of reaction_options) { // execute each reaction sequentially
        if (options_message.deleted) break; // don't add reactions to deleted messages

        const reaction_option_emoji = findCustomEmoji(reaction_option.emoji_name) ?? nodeEmoji.emojify(nodeEmoji.get(reaction_option.emoji_name));
        if (!reaction_option_emoji) {
            console.error(`An invalid reaction was passed to 'sendOptionsMessage': ${reaction_option.emoji_name}`)
            continue; // the remaining reactions might be valid so continue
        }

        let bot_reaction;
        try {
            bot_reaction = await options_message.react(reaction_option_emoji);
            await Timer(250); // prevent API abuse (250 seems io work best)
        } catch { // the most likely exception thrown will be the message was deleted and the reaction can't be added
            console.warn(`Unable to add reaction: ${reaction_option_emoji}`);
            break; // there is no reason to continue trying to add reactions after a failed attempt
        }

        const cooldown_time_ms = reaction_option.cooldown ?? 1500;
        let last_time_of_action = Date.now() - cooldown_time_ms; // subtract the cooldown so that the button can be pressed immediately after it shows up
        const options_message_reaction_collector = options_message.createReactionCollector((user_reaction, user) => {
            const is_not_bot = !user.bot;
            const emoji_matches = bot_reaction.emoji.name === user_reaction.emoji.name;
            const confirmation_user_matches = confirmation_user_id ? confirmation_user_id === user.id : true;
            return (is_not_bot && emoji_matches && confirmation_user_matches);
        });
        options_message_reaction_collector.on('collect', async (collected_reaction, user) => {
            const recent_time_of_action = Date.now();
            const last_time_of_action_was_recent = recent_time_of_action - last_time_of_action < cooldown_time_ms;
            last_time_of_action = Date.now();
            if (last_time_of_action_was_recent) return; // force the user to wait before clicking the button again
            await Timer(250); // prevent API abuse
            reaction_option.callback(options_message, collected_reaction, user);
        });
    }

    return options_message;
}

/**
 * Removes any reactions created by any user on a specified message
 * @param {Message} message 
 */
async function removeUserReactionsFromMessage(message) {
    await Timer(250); // prevent API abuse
    if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
        const message_reactions = message.reactions.cache;
        for (const message_reaction of message_reactions.values()) {
            const reaction_users = message_reaction.users.cache.filter(user => !user.bot); // don't interact with bots
            for (const reaction_user of reaction_users.values()) {
                message_reaction.users.remove(reaction_user);
                if (reaction_users.size > 0) await Timer(250); // prevent API abuse
            }
        }
    }
}

/**
 * Removes any reactions created by a user on a specified message
 * @param {Message} message 
 */
async function removeAllReactionsFromMessage(message) {
    await Timer(250); // prevent API abuse
    if (message.guild.me.hasPermission('MANAGE_MESSAGES')) {
        return await message.reactions.removeAll();
    }
}

/**
 * Removes a specified message from a specified channel
 * @param {String} channel_id 
 * @param {String} message_id 
 * @returns {Promise<Message>}
 */
async function removeMessageFromChannel(channel_id, message_id) {
    const channel_containing_message = client.channels.cache.get(channel_id);
    if (channel_containing_message) {
        if (!channel_containing_message.guild) {
            throw new Error('Message does not reside in a Guild!');
        } else {
            const recent_messages_in_channel = await channel_containing_message.messages.fetch({limit:100});
            const the_message_to_remove = recent_messages_in_channel.get(message_id);
            const the_removed_message = await the_message_to_remove?.delete({timeout:500});
            return the_removed_message;
        }
    } else {
        throw new Error('Channel not found!');
    }
}

/**
 * * Sends a volume controller embed
 * @param {String} channel_id 
 * @param {Message} old_message 
 */
function sendVolumeControllerEmbed(channel_id, old_message=undefined) {
    const guild = client.channels.cache.get(channel_id).guild;
    const server = disBotServers[guild.id];
    const makeEmbed = () => new CustomRichEmbed({
        title:`The Current Volume Is: ${constructNumberUsingEmoji(server.volume_manager.volume)}`,
        description:`[Help keep ${bot_config.common_name} free for everyone!](${bot_config.patreon})`
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
                    title:`${server.volume_manager.muted ? 'Muted' : 'Unmuted'} Audio Playback`,
                    description:`[Help keep ${bot_config.common_name} free for everyone!](${bot_config.patreon})`
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
                    title:`Set The Volume To ${constructNumberUsingEmoji(server.volume_manager.volume)}`,
                    description:`[Help keep ${bot_config.common_name} free for everyone!](${bot_config.patreon})`
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
                    description:(new_volume === old_volume ? (
                        `The maximum volume can be increased beyond this!\nIf you are an Administrator, check out:${'```'}\n${guild_config.command_prefix}set_volume_maximum\n${'```'}`
                    ) : `[Help keep ${bot_config.common_name} free for everyone!](${bot_config.patreon})`)
                }));
            }
        }
    ]);
}

/**
 * Sends a music controller embed
 * @param {String} channel_id 
 * @param {Messsage|undefined} old_message 
 */
function sendMusicControllerEmbed(channel_id, old_message=undefined) {
    const embed_title = 'Audio Controller';
    const server = disBotServers[client.channels.cache.get(channel_id).guild.id];
    const audio_controller = server.audio_controller;
    const makeEmbed = () => new CustomRichEmbed({title:`${embed_title}`}, old_message);
    sendOptionsMessage(channel_id, makeEmbed(), [
        {
            emoji_name:'bot_emoji_play_pause',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                if (audio_controller.paused === true) {
                    audio_controller.resume();
                    options_message.edit(new CustomRichEmbed({
                        author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                        title:`${embed_title}`,
                        description:'Resumed Music'
                    }));
                } else if (audio_controller.paused === false) {
                    audio_controller.pause();
                    options_message.edit(new CustomRichEmbed({
                        author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                        title:`${embed_title}`,
                        description:'Paused Music'
                    }));
                } else { // There isn't an active connection with music
                    options_message.edit(new CustomRichEmbed({
                        color:0xFFFF00,
                        author:{iconURL:user.displayAvatarURL({dynamic:true}), name:`@${user.tag}`},
                        title:`${embed_title} - Unable to pause or resume music`,
                        description:'Nothing is playing in the queue right now!'
                    }));
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
                        description:'Skipped The Current Item In The Queue'
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
                    description:'Shuffled The Queue'
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
                    description:`${server.queue_manager.loop_enabled ? 'Started' : 'Stopped'} Looping The Entire Queue`
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
                    description:`${server.queue_manager.loop_enabled ? 'Started' : 'Stopped'} Looping The First Item In The Queue`
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

/**
 * Sends a YouTube Discord Embed used by this bot
 * @param {Message} user_message 
 * @param {VideoInfo} videoInfo 
 * @param {String} status 
 */
function sendYtDiscordEmbed(user_message, videoInfo, status='Playing') {
    const server = disBotServers[user_message.guild.id];
    const guild_config_manipulator = new GuildConfigManipulator(user_message.guild.id);
    const guild_config = guild_config_manipulator.config;
    let show_player_description = guild_config.player_description === 'enabled';
    function makeYTEmbed() {
        return new CustomRichEmbed({
            title:`${server.queue_manager.loop_enabled ? 'Looping' : (server.queue_manager.autoplay_enabled ? 'Autoplaying' : status)}: ${videoInfo.videoDetails.title}`,
            description:(show_player_description ? ([
                `Author: [${videoInfo.videoDetails.author.name}](${videoInfo.videoDetails.author.channel_url})`,
                `Uploaded: ${videoInfo.videoDetails.publishDate}`,
                `Duration: ${getReadableTime(parseInt(videoInfo.videoDetails.lengthSeconds))}`,
                `Age Restricted: ${videoInfo.videoDetails.age_restricted ? 'Yes' : 'No'}`,
                `Rating: ${((videoInfo.videoDetails.averageRating / 5) * 100).toFixed(2)}% of people like this`,
                `Likes: ${videoInfo.videoDetails.likes ?? 'n/a'}`,
                `Dislikes: ${videoInfo.videoDetails.dislikes ?? 'n/a'}`,
                `Views: ${videoInfo.videoDetails.viewCount ?? 'n/a'}`,
                `Link: [https://youtu.be/${videoInfo.videoDetails.videoId}](https://youtu.be/${videoInfo.videoDetails.videoId})`,
                `Volume: ${server.volume_manager.volume}%`
            ].join('\n')) : `[https://youtu.be/${videoInfo.videoDetails.videoId}](https://youtu.be/${videoInfo.videoDetails.videoId})`),
            thumbnail:(show_player_description ? `${bot_cdn_url}/youtube_logo.png` : `${videoInfo.videoDetails.thumbnail.thumbnails.slice(-1).pop().url}`),
            image:(show_player_description ? `${videoInfo.videoDetails.thumbnail.thumbnails.slice(-1).pop().url}` : undefined)
        }, user_message);
    }
    sendOptionsMessage(user_message.channel.id, makeYTEmbed(), [
        {
            emoji_name:'bot_emoji_information',
            cooldown:1000,
            callback:(options_message, collected_reaction, user) => {
                removeUserReactionsFromMessage(options_message);
                show_player_description = !show_player_description;
                options_message.edit(makeYTEmbed());
            }
        },
        {
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

/**
 * Sends the "Unauthorized Access Detected" message when a user shouldn't have access
 * @param {Message} message 
 */
async function sendNotAllowedCommand(message) {
    const embed = new CustomRichEmbed({
        color:0xFF00FF,
        title:'Unauthorized Access Detected!',
        description:`Sorry you aren't allowed to use: ${'```'}\n${message.cleanContent}${'```'}Try contacting a guild admin or an ${bot_config.common_name} admin if you believe this to be in fault.`,
        footer:null
    }, message);
    try {
        await message.channel.send(embed);
    } catch {
        const dm_channel = await message.author.createDM();
        dm_channel.send(embed).catch(console.warn);
    }
}

/**
 * Logs admin commands to a guilds logging channel
 * @param {Message} admin_message 
 * @param {Message} custom_log_message 
 */
function logAdminCommandsToGuild(admin_message, custom_log_message=undefined) {
    const moderation_log_channel = admin_message.guild.channels.cache.find(c => c.name === bot_config.special_channels.GUILD_MODERATION.public_name);
    moderation_log_channel?.send(custom_log_message ?? new CustomRichEmbed({
        title:`An Admin Command Has Been Used!`,
        description:`Command Used:${'```'}\n${admin_message.content}${'```'}`,
        fields:[
            {name:'Admin', value:`${admin_message.author} (${admin_message.author.id})`},
            {name:'Channel', value:`${admin_message.channel}`},
            {name:'Message Link', value:`[Jump To Where The Command Was Used](${admin_message.url})`}
        ]
    }))?.catch(console.warn);
}

module.exports = {
    sendLargeMessage,
    sendConfirmationEmbed,
    sendOptionsMessage,
    removeUserReactionsFromMessage,
    removeAllReactionsFromMessage,
    removeMessageFromChannel,
    sendVolumeControllerEmbed,
    sendMusicControllerEmbed,
    sendYtDiscordEmbed,
    sendNotAllowedCommand,
    logAdminCommandsToGuild,
};