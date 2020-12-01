'use strict';

//#region local dependencies
const axios = require('axios');
const validator = require('validator');
const { default: soundCloudDownloader } = require('soundcloud-downloader');

const { forcePromise } = require('../../utilities.js');

const { logUserError } = require('../../libs/errors.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { QueueItem,
        QueueItemPlayer } = require('../../libs/QueueManager.js');
const { createConnection } = require('../../libs/createConnection.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { playYouTube } = require('../../libs/youtube.js');

const bot_cdn_url = process.env.BOT_CDN_URL;
//#endregion local dependencies

function detect_unsupported_urls(search_query) {
    if (search_query.includes('spotify.com/')
     || search_query.includes('twitter.com/')
     || search_query.includes('facebook.com/')
    ) {
        return true;
    } else {
        return false;
    }
}

function detect_unsupported_attachment(message_attachment) {
    if (message_attachment) {
        if (message_attachment.name.endsWith('.mp3')) {
            return false;
        } else {
            return true;
        }
    } else {
        return false;
    }
}

async function detect_remote_mp3(search_query='') {
    if (validator.isURL(search_query)) {
        try {
            // check the mime-type of the remote resource
            const response_to_url = await forcePromise(axios.head(search_query), 500, undefined);
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

async function playRemoteMP3(message, remote_mp3_path, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    const voice_connection = await createConnection(message.member.voice.channel);
    const stream_maker = () => `${remote_mp3_path}`;
    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 7.5, () => {
        if (!guild_queue_manager.loop_enabled) {
            /* don't send messages when looping */
            message.channel.send(new CustomRichEmbed({
                title: 'Playing A MP3 File From The Internet',
                description: `${'```'}\n${remote_mp3_path}\n${'```'}`,
            }, message));
        }
    }, () => {}, (error) => {
        console.trace(error);
    });
    guild_queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name: `${remote_mp3_path}`}), (playnext ? 2 : undefined)).then(() => {
        if (guild_queue_manager.queue.length > 1) {
            message.channel.send(new CustomRichEmbed({
                title: 'Added A MP3 File From The Internet',
                description: `${'```'}\n${remote_mp3_path}\n${'```'}`,
            }, message));
        }
    });
}

async function playUserUploadedMP3(message, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    const message_media = message.attachments.first();
    if (message_media) {
        if (message_media.attachment.endsWith('.mp3')) {
            const voice_connection = await createConnection(message.member.voice.channel);
            const stream_maker = () => `${message_media.attachment}`;
            const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 7.5, () => {
                if (!guild_queue_manager.loop_enabled) {
                    /* don't send messages when looping */
                    message.channel.send(new CustomRichEmbed({
                        title: 'Playing A MP3 File From Their Computer',
                        description: `${'```'}\n${message_media.name}\n${'```'}`,
                    }, message));
                }
            }, () => {
                if (message.deletable) {
                    message.delete({timeout: 500}).catch(null);
                }
            }, (error) => {
                console.trace(error);
            });
            guild_queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name: `${message_media.name}`}), (playnext ? 2 : undefined)).then(() => {
                if (guild_queue_manager.queue.length > 1) {
                    message.channel.send(new CustomRichEmbed({
                        title: 'Added A MP3 File From Their Computer',
                        description: `${'```'}\n${message_media.name}\n${'```'}`,
                    }, message));
                }
            });
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Uh Oh!',
                description: 'I wasn\'t able to play that mp3 file (if it even was one)!',
            }, message));
        }
    } else {
        message.channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            title: 'Did someone try playing an MP3?',
            description: 'Its kinda hard to play an MP3 without one...\nNext time upload an mp3 in the same message!',
        }, message));
    }
}

function detect_broadcastify(search_query='') {
    return !!search_query.match(/((http|https)\:\/\/(www.)*(broadcastify\.com\/)(webPlayer|listen\/feed)\/\d+)/gi);
}

async function playBroadcastify(message, search_query, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    const broadcast_id = search_query.match(/(\d+)/)?.[0]; // ID should be numbers only
    if (!broadcast_id) return;
    const broadcastify_website_url = `https://www.broadcastify.com/listen/feed/${broadcast_id}`;
    const broadcastify_stream_url = `https://broadcastify.cdnstream1.com/${broadcast_id}`;
    const voice_connection = await createConnection(message.member.voice.channel);
    const stream_maker = () => `${broadcastify_stream_url}`;
    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 10.0, () => {
        if (!guild_queue_manager.loop_enabled) {
            /* don't send messages when looping */
            message.channel.send(new CustomRichEmbed({
                title: 'Playing Broadcastify Stream',
                description: [
                    `[Website Link - ${broadcast_id}](${broadcastify_website_url})`,
                    `[Stream Link - ${broadcast_id}](${broadcastify_stream_url})`,
                ].join('\n'),
            }, message));
        }
    }, () => {}, (error) => {
        console.trace(error);
    });
    guild_queue_manager.addItem(new QueueItem('other', player, 'Broadcastify Stream'), (playnext ? 2 : undefined)).then(() => {
        if (guild_queue_manager.queue.length > 1) {
            message.channel.send(new CustomRichEmbed({
                title: 'Added Broadcastify Stream',
                description: [
                    `[Website Link - ${broadcast_id}](${broadcastify_website_url})`,
                    `[Stream Link - ${broadcast_id}](${broadcastify_stream_url})`,
                ].join('\n'),
            }, message));
        }
    });
}

function detect_soundcloud(search_query='') {
    return !!search_query.match(/((http|https)\:\/\/(www.)*(soundcloud\.com\/))/gi);
}

async function playSoundcloud(message, search_query, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    try {
        await axios.head(search_query);
    } catch {
        message.channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            title: 'Hmm',
            description: 'I don\'t think that was a valid soundcloud url!',
        }, message));
        return;
    }

    const voice_connection = await createConnection(message.member.voice.channel);
    const stream_maker = async () => {
        let stream;
        try {
            stream = await soundCloudDownloader.download(search_query, process.env.SOUNDCLOUD_CLIENT_ID);
        } catch (error) {
            logUserError(message, error);
            throw error;
        } finally {
            return stream;
        }
    };
    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 10.0, () => {
        if (!guild_queue_manager.loop_enabled) {
            /* don't send messages when looping */
            message.channel.send(new CustomRichEmbed({
                title: 'Playing Soundcloud Stream',
                description: [
                    `[Website Link](${search_query})`,
                ].join('\n'),
            }, message));
        }
    }, () => {}, (error) => {
        console.trace(error);
    });
    guild_queue_manager.addItem(new QueueItem('other', player, 'Soundcloud Stream'), (playnext ? 2 : undefined)).then(() => {
        if (guild_queue_manager.queue.length > 1) {
            message.channel.send(new CustomRichEmbed({
                title: 'Added Soundcloud Stream',
                description: [
                    `[Website Link](${search_query})`
                ].join('\n'),
            }, message));
        }
    });
}

module.exports = new DisBotCommand({
    name: 'PLAY',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 1,
    description: 'play music from youtube and more',
    aliases: [`play`, `p`, `playnext`, `pn`, ``],
    cooldown: 5_000,
    async executor(Discord, client, message, opts={}) {
        const { command_prefix, discord_command, command_args } = opts;

        const playnext = [`${command_prefix}playnext`, `${command_prefix}pn`].includes(discord_command);

        if (!message.member?.voice?.channel) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Whoops!',
                description: 'You need to be in a voice channel to use this command!',
            }, message));
            return;
        }

        const message_attachment = message.attachments.first() ?? undefined;
        
        if (detect_unsupported_urls(command_args.join(' '))) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: `Playing music from that website isn't supported!`,
                description: `Use \`${discord_command}\` to see how to use this command.`,
            }));
        } else if (detect_unsupported_attachment(message_attachment)) {
            const message_attachment_extension = message_attachment?.name?.match(/[^.]+$/g)?.[0] ?? 'unknown';
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: `Playing music from files ending in \`.${message_attachment_extension}\` aren\'t supported!`,
                description: `Use \`${discord_command}\` to see how to use this command.`,
            }));
        } else if (message.attachments.first()?.attachment?.endsWith('.mp3')) {
            playUserUploadedMP3(message, playnext);
        } else if (command_args.join('').length > 0) {
            if (await detect_remote_mp3(command_args.join(' '))) {
                playRemoteMP3(message, command_args.join(' '), playnext);
            } else if (detect_broadcastify(command_args.join(' '))) {
                playBroadcastify(message, command_args.join(' '), playnext);
            } else if (detect_soundcloud(command_args.join(' '))) {
                playSoundcloud(message, command_args.join(' '), playnext);
            } else {
                playYouTube(message, command_args.join(' '), playnext);
            }
        } else {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'That\'s just not how you use this command!',
                description: 'Take a look below to see how you should have done it!',
                fields: [
                    {
                        name: 'Playing Videos & Playlists From YouTube:',
                        value: [
                            `${'```'}\n${discord_command} ussr national anthem\n${'```'}`,
                            `${'```'}\n${discord_command} https://youtu.be/U06jlgpMtQs\n${'```'}`,
                            `${'```'}\n${discord_command} https://www.youtube.com/playlist?list=OLAK5uy_nkeSq0KxbS-AoMa0j5Oh2d4IAkACXsrBI\n${'```'}`,
                        ].join('')
                    }, {
                        name: 'Playing Soundcloud URLs:',
                        value: `${'```'}\n${discord_command} https://soundcloud.com/nfrealmusic/sets/the-search-9\n${'```'}`,
                    }, {
                        name: 'Playing Broadcastify URLs:',
                        value: `${'```'}\n${discord_command} https://www.broadcastify.com/webPlayer/22380\n${'```'}`,
                    }, {
                        name: 'Playing MP3 Files From The Internet:',
                        value: `${'```'}\n${discord_command} ${bot_cdn_url}/the-purge.mp3\n${'```'}`,
                    }, {
                        name: 'Playing MP3 Files From Your Computer:',
                        value: `${'```'}\n${discord_command}\n${'```'}(Don't forget to attach the .mp3 file to the message)`,
                    },
                ],
                image: `${bot_cdn_url}/mp3_command_usage.png`,
            }, message));
        }
    },
});
