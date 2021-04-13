'use strict';

const nodeEmoji = require('node-emoji');

const bot_config = require('../../config.js');

const { Timer,
        getReadableTime } = require('../utilities.js');

const { Discord,
        client } = require('./discord_client.js');

const { CustomRichEmbed } = require('./CustomRichEmbed.js');
const { findCustomEmoji,
        constructNumberUsingEmoji } = require('./emoji.js');
const { isThisBotsOwner } = require('./permissions.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_cdn_url = process.env.BOT_CDN_URL;

//---------------------------------------------------------------------------------------------------------------//

/**
 * Removes any reactions created by any user on a specified message
 * @param {Discord.Message} message 
 * @returns {Promise<void>} 
 */
async function removeUserReactionsFromMessage(message) {
    await Timer(250); // prevent API abuse

    if (message.guild.me.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) {
        const message_reactions = message.reactions.cache;
        for (const message_reaction of message_reactions.values()) {
            const reaction_users = message_reaction.users.cache.filter(user => !user.bot); // don't interact with bots
            for (const reaction_user of reaction_users.values()) {
                message_reaction.users.remove(reaction_user);
                if (reaction_users.size > 0) await Timer(250); // prevent API abuse
            }
        }
    }

    return;
}

/**
 * Removes any reactions created by a user on a specified message
 * @param {Discord.Message} message 
 * @returns {Promise<Discord.Message|null>} 
 */
async function removeAllReactionsFromMessage(message) {
    await Timer(250); // prevent API abuse

    /* check if a message was supplied */
    if (!(message instanceof Discord.Message)) throw new TypeError('\`message\` was not an instance of a \`Discord.Message\`');

    /* check if the bot can remove message reactions */
    if (!message.guild?.me?.permissions?.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)) return null;

    /* attempt to remove all message reactions and return the message */
    return await message.reactions.removeAll().catch(() => message);
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Breaks apart a large_message and sends it in chunks to a specified channel
 * @param {String} channel_id 
 * @param {String} large_message 
 * @param {String} code_block_language 
 * @returns {Promise<Discord.Message[]>} a promise for an array of discord messages
 */
async function sendLargeMessage(channel_id, large_message, code_block_language='') {
    const sent_messages = [];
    const message_chunks = `${large_message}`.match(/[^]{1,1500}/g); // Split the message into 1500 character long chunks
    for (const message_chunk of message_chunks) {
        let sent_message;
        try {
            sent_message = await client.channels.cache.get(channel_id).send(`${'```'}${code_block_language}\n${message_chunk}\n${'```'}`);
        } catch (error) {
            console.warn(error);
        } finally {
            sent_messages.push(sent_message);
            await Timer(1000);
        }
    }
    return sent_messages;
}

const options_message_reactions_template = [
    {
        emoji_name: 'bot_emoji_checkmark',
        cooldown: 1000,
        callback(options_message, collected_reaction, user) {},
    }, {
        emoji_name: 'bot_emoji_close',
        cooldown: 1000,
        callback(options_message, collected_reaction, user) {},
    },
];
/**
 * Sends a message with clickable reactions for a user to interact with
 * @param {String} channel_id the id of the channel receiving the options_message
 * @param {MessageContents} message_contents any valid input for channel.send(...)
 * @param {options_message_reactions_template} reaction_options an object that derives from an `options_message_reactions_template`
 * @param {Object} opts additional options
 * @param {String?} opts.confirmation_user_id the user_id to confirm the reaction's origin with
 * @param {Boolean?} opts.auto_cleanup_reactions whether or not to auto-remove reactions after the `auto_cleanup_time`
 * @param {Number?} opts.auto_cleanup_timeout (default: 5 * 60_000) amount of ms to wait for
 * @returns {Promise<Discord.Message>} the options_message after attempting to add all reactions
 */
async function sendOptionsMessage(channel_id, message_contents, reaction_options=options_message_reactions_template, opts={}) {
    const _opts = {
        ...{
            confirmation_user_id: undefined,
            auto_cleanup_reactions: true,
            auto_cleanup_timeout: 5 * 60_000, // 5 minutes
        },
        ...opts,
    };

    const channel = client.channels.resolve(channel_id);

    const options_message = await channel.send(message_contents).catch(console.warn);
    if (!options_message) throw new Error(`Unable to send options_message!`);

    for (const reaction_option of reaction_options) { // execute each reaction sequentially
        if (options_message.deleted) break; // don't add reactions to deleted messages

        const reaction_option_emoji = await findCustomEmoji(reaction_option.emoji_name) ?? nodeEmoji.emojify(nodeEmoji.get(reaction_option.emoji_name));
        if (!reaction_option_emoji) {
            console.error(`An invalid reaction was passed to \'sendOptionsMessage\': ${reaction_option.emoji_name}`)
            continue; // the remaining reactions might be valid so continue
        }

        let bot_reaction;
        try {
            bot_reaction = await options_message.react(reaction_option_emoji);
            await Timer(250); // prevent API abuse (250 seems to work best)
        } catch {
            /**
             * The most likely exceptions will be:
             *  - the message was deleted and the reaction can't be added
             *  - the bot can't add reactions in this channel
             */
            console.warn(`Unable to add reaction: ${reaction_option_emoji};`);
            break; // there is no reason to continue trying to add reactions after a failed attempt
        }

        const cooldown_time_ms = reaction_option.cooldown ?? 1500;
        let last_time_of_action = Date.now() - cooldown_time_ms; // subtract the cooldown so that the button can be pressed immediately after it shows up
        const options_message_reaction_collector = options_message.createReactionCollector((user_reaction, user) => {
            const is_not_bot = !user.bot;
            const emoji_matches = bot_reaction.emoji.name === user_reaction.emoji.name;
            const confirmation_user_matches = _opts.confirmation_user_id ? _opts.confirmation_user_id === user.id : true;
            return (is_not_bot && emoji_matches && confirmation_user_matches);
        });
        options_message_reaction_collector.on('collect', async (collected_reaction, user) => {
            const recent_time_of_action = Date.now();
            const last_time_of_action_was_recent = recent_time_of_action - last_time_of_action < cooldown_time_ms;
            last_time_of_action = Date.now();
            if (last_time_of_action_was_recent) return; // force the user to wait before clicking the button again

            if (client.$.restarting_bot && !isThisBotsOwner(user.id)) return;
            if (client.$.lockdown_mode && !isThisBotsOwner(user.id)) return;
            if (channel.guild && client.$.guild_lockdowns.get(channel.guild.id)) return;
            if (await client.$.blacklisted_users_manager.hasConfig(user.id)) return;

            await Timer(250); // prevent API abuse

            reaction_option.callback(options_message, collected_reaction, user);
        });
    }

    if (_opts.auto_cleanup_reactions) {
        setTimeout(() => {
            removeAllReactionsFromMessage(options_message);
        }, _opts.auto_cleanup_timeout);
    }

    return options_message;
}

/**
 * Sends an embed with buttons for the user to click on
 * @param {String} confirmation_user_id 
 * @param {String} channel_id 
 * @param {Boolean} delete_after_selection 
 * @param {MessageContents} message_contents 
 * @param {Function} yes_callback 
 * @param {Function} no_callback 
 */
async function sendConfirmationMessage(confirmation_user_id, channel_id, delete_after_selection=true, message_contents='Default Embed', yes_callback=(options_message)=>{}, no_callback=(options_message)=>{}) {
    const options_message = await sendOptionsMessage(channel_id, message_contents, [
        {
            emoji_name: 'bot_emoji_checkmark',
            cooldown: 1500,
            callback(options_message, collected_reaction, user) {
                if (delete_after_selection) options_message.delete().catch(console.warn);
                yes_callback(options_message);
            },
        }, {
            emoji_name: 'bot_emoji_close',
            cooldown: 1500,
            callback(options_message, collected_reaction, user) {
                if (delete_after_selection) options_message.delete().catch(console.warn);
                no_callback(options_message);
            },
        },
    ], {
        confirmation_user_id: confirmation_user_id,
    });

    return options_message;
}

/**
 * Sends a captcha code message for the user to respond to with the code
 * @param {String} confirmation_user_id 
 * @param {String} channel_id 
 * @param {Function} success_callback 
 * @param {Function} failure_callback 
 * @returns {Message} the captcha message that the bot sent
 */
async function sendCaptchaMessage(confirmation_user_id, channel_id, success_callback=(bot_captcha_message, collected_message)=>{}, failure_callback=(bot_captcha_message)=>{}) {
    const channel = client.channels.resolve(channel_id);

    const captcha_code = (new Buffer.from(`${Date.now()}`.slice(7))).toString('base64');
    const bot_captcha_message = await channel.send(`<@${confirmation_user_id}>`, new CustomRichEmbed({
        color: 0xFF00FF,
        title: 'You must send the CAPTCHA below to continue!',
        description: `${'```'}\n${captcha_code}\n${'```'}`,
    })).catch(console.warn);

    const message_collection_filter = (collected_message) => collected_message.author.id === confirmation_user_id && collected_message.cleanContent === captcha_code;
    const message_collector = bot_captcha_message.channel.createMessageCollector(message_collection_filter, {
        max: 1,
        time: 60_000,
    });
    message_collector.on('collect', async (collected_message) => {
        if (client.$.restarting_bot && !isThisBotsOwner(collected_message.author.id)) return;
        if (client.$.lockdown_mode && !isThisBotsOwner(collected_message.author.id)) return;
        if (channel.guild && client.$.guild_lockdowns.get(channel.guild.id)) return;
        if (await client.$.blacklisted_users_manager.hasConfig(collected_message.author.id)) return;

        success_callback(bot_captcha_message, collected_message);
    });
    message_collector.on('end', (collected_messages) => {
        if (collected_messages.size === 0) {
            if (client.$.restarting_bot && !isThisBotsOwner(collected_message.author.id)) return;
            if (client.$.lockdown_mode && !isThisBotsOwner(collected_message.author.id)) return;
            if (channel.guild && client.$.guild_lockdowns.get(channel.guild.id)) return;
            if (await client.$.blacklisted_users_manager.hasConfig(collected_message.author.id)) return;

            failure_callback(bot_captcha_message);
        }
    });

    return bot_captcha_message;
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Sends a volume controller embed
 * @param {String} channel_id 
 * @param {Message} user_message 
 */
async function sendVolumeControllerEmbed(channel_id, user_message=undefined) {
    const channel = client.channels.resolve(channel_id);
    const guild = channel.guild;

    const guild_volume_manager = client.$.volume_managers.get(guild.id);

    const makeEmbed = async () => new CustomRichEmbed({
        title: `The Current Volume Is: ${(await constructNumberUsingEmoji(guild_volume_manager.volume))}`,
    }, user_message);
    sendOptionsMessage(channel.id, await makeEmbed(), [
        {
            emoji_name: 'bot_emoji_mute',
            cooldown: 1000,
            async callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;
                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                await guild_volume_manager.toggleMute();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                        name: `@${user.tag}`,
                    },
                    title: `${guild_volume_manager.muted ? 'Muted' : 'Unmuted'} Audio Playback`,
                }));
            },
        }, {
            emoji_name: 'bot_emoji_volume_down',
            cooldown: 1000,
            async callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;
                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                await guild_volume_manager.decreaseVolume();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                        name: `@${user.tag}`,
                    },
                    title: `Set The Volume To ${(await constructNumberUsingEmoji(guild_volume_manager.volume))}`,
                }));
            },
        }, {
            emoji_name: 'bot_emoji_volume_up',
            cooldown: 1000,
            async callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;
                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                const guild_config = await client.$.guild_configs_manager.fetchConfig(guild.id);
                const old_volume = guild_volume_manager.volume;
                const [ updated_volume_manager, increase_amount ] = await guild_volume_manager.increaseVolume();
                const new_volume = updated_volume_manager.volume;
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                        name: `@${user.tag}`,
                    },
                    title: `Set The Volume To ${(await constructNumberUsingEmoji(guild_volume_manager.volume))}`,
                    description: (new_volume === old_volume ? `The maximum volume can be increased beyond this!\nIf you are an Administrator, check out:${'```'}\n${guild_config.command_prefix}set_volume_maximum\n${'```'}` : undefined),
                }));
            },
        },
    ]);
}

/**
 * Sends a music controller embed
 * @param {String} channel_id 
 * @param {Message|undefined} user_message 
 */
async function sendMusicControllerEmbed(channel_id, user_message=undefined) {
    const channel = client.channels.resolve(channel_id);
    const guild = channel.guild;

    const guild_audio_controller = client.$.audio_controllers.get(guild.id);
    const guild_queue_manager = client.$.queue_managers.get(guild.id);

    const audio_controller = guild_audio_controller;
    const embed_title = 'Audio Controller';
    const makeEmbed = async () => new CustomRichEmbed({
        title: `${embed_title}`,
    }, user_message);
    sendOptionsMessage(channel.id, await makeEmbed(), [
        {
            emoji_name: 'bot_emoji_play_pause',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                if (audio_controller.paused === true) {
                    audio_controller.resume();
                    options_message.edit(new CustomRichEmbed({
                        author: {
                            iconURL: user.displayAvatarURL({ dynamic: true }),
                            name: `@${user.tag}`,
                        },
                        title: `${embed_title}`,
                        description: 'Resumed Music',
                    }));
                } else if (audio_controller.paused === false) {
                    audio_controller.pause();
                    options_message.edit(new CustomRichEmbed({
                        author: {
                            iconURL: user.displayAvatarURL({ dynamic: true }),
                            name: `@${user.tag}`,
                        },
                        title: `${embed_title}`,
                        description: 'Paused Music',
                    }));
                } else { // There isn't an active connection with music
                    options_message.edit(new CustomRichEmbed({
                        color: 0xFFFF00,
                        author: {
                            iconURL: user.displayAvatarURL({ dynamic: true }),
                            name: `@${user.tag}`,
                        },
                        title: `${embed_title} - Unable to pause or resume music`,
                        description: 'Nothing is playing in the queue right now!',
                    }));
                }
            },
        }, {
            emoji_name: 'bot_emoji_stop_square',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                audio_controller.disconnect();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({dynamic: true}),
                        name: `@${user.tag}`
                    },
                    title: `${embed_title}`,
                    description: 'Stopped Music',
                }));
            },
        }, {
            emoji_name: 'bot_emoji_skip',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                audio_controller.skip();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({dynamic: true}),
                        name: `@${user.tag}`
                    },
                    title: `${embed_title}`,
                    description: 'Skipped The Current Item In The Queue',
                }));
            },
        }, {
            emoji_name: 'bot_emoji_shuffle',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                guild_queue_manager.shuffleItems();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({dynamic: true}),
                        name: `@${user.tag}`
                    },
                    title: `${embed_title}`,
                    description: 'Shuffled The Queue',
                }));
            },
        }, {
            emoji_name: 'bot_emoji_repeat_all',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                guild_queue_manager.setLoopType('multiple');
                guild_queue_manager.toggleLoop();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({dynamic: true}),
                        name: `@${user.tag}`
                    },
                    title: `${embed_title}`,
                    description: `${guild_queue_manager.loop_enabled ? 'Started' : 'Stopped'} Looping The Entire Queue`,
                }));
            },
        }, {
            emoji_name: 'bot_emoji_repeat_one',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                guild_queue_manager.setLoopType('single');
                guild_queue_manager.toggleLoop();
                options_message.edit(new CustomRichEmbed({
                    author: {
                        iconURL: user.displayAvatarURL({dynamic: true}),
                        name: `@${user.tag}`
                    },
                    title: `${embed_title}`,
                    description: `${guild_queue_manager.loop_enabled ? 'Started' : 'Stopped'} Looping The First Item In The Queue`,
                }));
            },
        }, {
            emoji_name: 'bot_emoji_volume_up',
            cooldown: 500,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                sendVolumeControllerEmbed(channel.id);
            },
        },
    ]);
}

/**
 * Sends a YouTube Discord Embed used by this bot
 * @param {Message} user_message 
 * @param {VideoInfo} videoInfo 
 * @param {String} status 
 */
async function sendYtDiscordEmbed(user_message, videoInfo, status='Playing') {
    const channel = user_message.channel;
    const guild = user_message.guild;

    const guild_queue_manager = user_message.client.$.queue_managers.get(guild.id);

    const guild_config = await user_message.client.$.guild_configs_manager.fetchConfig(guild.id);

    let show_player_description = guild_config.player_description === 'enabled';
    function makeYTEmbed() {
        const video_embed_status = (guild_queue_manager.queue.length <= 1 ? (
            guild_queue_manager.loop_enabled ? 'Looping' : (
                guild_queue_manager.autoplay_enabled ? 'Autoplaying' : status
            )
        ) : status);
        const video_thumbnails = videoInfo.videoDetails.thumbnails;
        const video_thumbnail_url = video_thumbnails[video_thumbnails.length - 1].url;
        return new CustomRichEmbed({
            title: `${video_embed_status}: ${videoInfo.videoDetails.title}`,
            description: (show_player_description ? ([
                `Author: [${videoInfo.videoDetails.author.name}](${videoInfo.videoDetails.author.channel_url})`,
                `Uploaded: ${videoInfo.videoDetails.uploadDate}`,
                `Duration: ${getReadableTime(parseInt(videoInfo.videoDetails.lengthSeconds))}`,
                `Age Restricted: ${videoInfo.videoDetails.age_restricted ? 'Yes' : 'No'}`,
                `Rating: ${((videoInfo.videoDetails.averageRating / 5) * 100).toFixed(2)}% of people like this`,
                `Likes: ${videoInfo.videoDetails.likes ?? 'n/a'}`,
                `Dislikes: ${videoInfo.videoDetails.dislikes ?? 'n/a'}`,
                `Views: ${videoInfo.videoDetails.viewCount ?? 'n/a'}`,
                `Link: [https://youtu.be/${videoInfo.videoDetails.videoId}](https://youtu.be/${videoInfo.videoDetails.videoId})`,
            ].join('\n')) : `[https://youtu.be/${videoInfo.videoDetails.videoId}](https://youtu.be/${videoInfo.videoDetails.videoId})`),
            thumbnail: (show_player_description ? `${bot_cdn_url}/youtube_logo.png` : `${video_thumbnail_url}`),
            image: (show_player_description ? `${video_thumbnail_url}` : undefined),
        }, user_message);
    }
    sendOptionsMessage(channel.id, makeYTEmbed(), [
        {
            emoji_name: 'bot_emoji_information',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                show_player_description = !show_player_description;
                options_message.edit(makeYTEmbed());
            },
        }, {
            emoji_name: 'bot_emoji_music',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                sendMusicControllerEmbed(channel.id);
            },
        }, {
            emoji_name: 'bot_emoji_volume_up',
            cooldown: 1000,
            callback(options_message, collected_reaction, user) {
                if (!guild.me.voice?.channelID) return;

                removeUserReactionsFromMessage(options_message);

                const member = guild.members.resolve(user);
                if (guild.me.voice?.channelID !== member.voice?.channelID) return;

                sendVolumeControllerEmbed(channel.id);
            },
        },
    ]);
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Sends the "Unauthorized Access Detected" message when a user shouldn't have access
 * @param {Message} message 
 */
async function sendNotAllowedCommand(message) {
    const embed = new CustomRichEmbed({
        color: 0xFF00FF,
        title: 'Unauthorized Access Detected!',
        description: `Sorry you aren\'t allowed to use: ${'```'}\n${message.cleanContent}${'```'}Try contacting a guild admin or an ${bot_config.COMMON_NAME} admin if you believe this to be in fault.`,
        footer: null,
    }, message);
    try {
        await message.channel.send(embed);
    } catch {
        const dm_channel = await message.author.createDM();
        dm_channel.send(embed).catch(console.warn);
    }
}

/**
 * Sends a disclaimer for potentially NSFW content
 * @param {Message} message 
 * @returns {Promise<true|false>} 
 */
async function sendPotentiallyNotSafeForWorkDisclaimer(message) {
    if (message.channel.nsfw) {
        /* when called in a nsfw channel, forgo any warnings */
        return true;
    } else {
        /* when called in a non-nsfw channel, display a warning informing the user of potential nsfw-content */
        return new Promise((resolve, reject) => {
            const confirmation_embed = new CustomRichEmbed({
                title: 'This feature might include potentially NSFW content!',
                description: [
                    'This is **not** a nsfw channel!',
                    'By clicking on the checkmark, you affirm that you are **18+ years old** and **accept any responsibility** for content sent.',
                ].join('\n'),
            }, message);
            sendConfirmationMessage(message.author.id, message.channel.id, true, confirmation_embed, () => {
                resolve(true);
            }, () => {
                resolve(false);
            }).catch((error) => reject(error));
        });
    }
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Logs admin commands to a guilds logging channel
 * @param {Message} admin_message 
 * @param {Message} custom_log_message 
 */
function logAdminCommandsToGuild(admin_message, custom_log_message=undefined) {
    const moderation_log_channel = admin_message.guild.channels.cache.find(c => c.name === bot_config.SPECIAL_CHANNELS.find(ch => ch.id === 'GUILD_MODERATION').name);
    moderation_log_channel?.send(custom_log_message ?? new CustomRichEmbed({
        title: 'An Admin Command Has Been Used!',
        description: `Command Used:${'```'}\n${admin_message.content}\n${'```'}`,
        fields: [
            {
                name: 'Admin',
                value: `${admin_message.author} (${admin_message.author.id})`,
            }, {
                name: 'Channel',
                value: `${admin_message.channel}`,
            }, {
                name: 'Message Link',
                value: `[Jump To Where The Command Was Used](${admin_message.url})`,
            },
        ],
    }))?.catch(console.warn);
}

//---------------------------------------------------------------------------------------------------------------//

/**
 * Check channel for permissions to send (messages / embeds / files / reactions / emojis).  
 * Also try to inform the user of the missing permissions.
 * @param {Guild} guild 
 * @param {Channel} channel 
 * @param {Message} message 
 * @returns {Boolean} `true` when missing permissions
 */
async function notifyWhenMissingSendPermissions(guild, channel, message) {
    const required_send_permissions = [ 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'ADD_REACTIONS', 'USE_EXTERNAL_EMOJIS' ];
    const missing_send_permissions = channel.permissionsFor(guild.me).missing(required_send_permissions);

    if (missing_send_permissions.length > 0) {
        const missing_send_permissions_warning_embed = new CustomRichEmbed({
            color: 0xFF0000,
            title: 'Something isn\'t right here!',
            description: [
                'I am missing the following permission(s):',
                `${missing_send_permissions.map(item => ` - \`${item}\``).join('\n')}`,
                `Please give me the above permission(s) as they are essential to how I send messages and interactive content!`,
            ].join('\n\n'),
        }, message);

        try {
            await message.reply(missing_send_permissions_warning_embed);
        } catch {
            const dm_channel = await message.author.createDM().catch(() => null);
            await dm_channel?.send(missing_send_permissions_warning_embed)?.catch(() => null);
        }

        return true;
    } else {
        return false;
    }
}

//---------------------------------------------------------------------------------------------------------------//

module.exports = {
    sendLargeMessage,
    sendConfirmationMessage,
    sendOptionsMessage,
    sendCaptchaMessage,
    removeUserReactionsFromMessage,
    removeAllReactionsFromMessage,
    sendVolumeControllerEmbed,
    sendMusicControllerEmbed,
    sendYtDiscordEmbed,
    sendNotAllowedCommand,
    sendPotentiallyNotSafeForWorkDisclaimer,
    logAdminCommandsToGuild,
    notifyWhenMissingSendPermissions,
};
