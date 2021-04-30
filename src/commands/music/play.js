'use strict';

//#region dependencies
const axios = require('axios');
const validator = require('validator');
const { default: soundCloudDownloader } = require('soundcloud-downloader');
const spotifyUri = require('spotify-uri');

const { Timer } = require('../../utilities.js');

const { forcePromise } = require('../../utilities.js');

const { logUserError } = require('../../libs/errors.js');
const { CustomRichEmbed } = require('../../libs/CustomRichEmbed.js');
const { QueueItem,
        QueueItemPlayer } = require('../../libs/QueueManager.js');
const { createConnection } = require('../../libs/createConnection.js');
const { DisBotCommand,
        DisBotCommander } = require('../../libs/DisBotCommander.js');
const { playYouTube } = require('../../libs/youtube.js');
const { sendOptionsMessage } = require('../../libs/messages.js');
const { isThisBotsOwner } = require('../../libs/permissions.js');

const bot_cdn_url = process.env.BOT_CDN_URL;
//#endregion dependencies

function detect_unsupported_urls(search_query) {
    if (search_query.includes('vimeo.com/')
     || search_query.includes('twitter.com/')
     || search_query.includes('facebook.com/')
    ) {
        return true;
    } else {
        return false;
    }
}

//---------------------------------------------------------------------------------------------------------------//

async function detect_remote_audio_stream(search_query='') {
    if (validator.isURL(search_query)) {
        try {
            /* check the mime-type of the remote resource */
            const response = await forcePromise(axios.head(search_query), 15_0000, undefined);
            const content_type = response?.headers?.['content-type'];
            const is_valid_audio_stream = ['audio/mpeg'].includes(content_type);
            return is_valid_audio_stream;
        } catch (error) {
            console.trace(error);
            return false;
        }
    } else {
        return false;
    }
}

async function playRemoteMP3(message, remote_mp3_path, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    const voice_connection = await createConnection(message.member.voice.channel);

    const stream_url = `${remote_mp3_path}`;
    const stream_maker = async () => {
        const { data: response_stream } = await axios({
            method: 'get',
            url: stream_url,
            responseType: 'stream',
        });

        return response_stream;
    };

    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 0.5, () => {
        if (guild_queue_manager.loop_enabled) return; // don't continue when queue looping is enabled

        message.channel.send(new CustomRichEmbed({
            title: 'Playing An MP3 File From The Internet',
            description: `${'```'}\n${remote_mp3_path}\n${'```'}`,
        }, message));
    }, () => {
        // end-of-playback callback
    }, (error) => {
        console.trace(error);
    });

    await guild_queue_manager.addItem(new QueueItem('mp3', player, 'MP3', {
        mp3_file_name: `${remote_mp3_path}`,
    }), (playnext ? 2 : undefined));

    if (guild_queue_manager.queue.length > 1) {
        message.channel.send(new CustomRichEmbed({
            title: 'Added An MP3 File From The Internet',
            description: `${'```'}\n${remote_mp3_path}\n${'```'}`,
        }, message));
    }
}

async function playUserUploadedMP3(message, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    const message_media = message.attachments.first();
    if (!message_media) {
        message.channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            title: 'Did someone try playing an MP3?',
            description: 'Its kinda hard to play an MP3 without one...\nNext time upload an mp3 in the same message!',
        }, message));
        return;
    }

    const voice_connection = await createConnection(message.member.voice.channel);
    const stream_url = `${message_media.attachment}`;

    const stream_maker = async () => {
        const { data: response_stream } = await axios({
            method: 'get',
            url: stream_url,
            responseType: 'stream',
        });
        return response_stream;
    };
    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 0.5, () => {
        if (guild_queue_manager.loop_enabled) return; // don't continue when queue looping is enabled

        message.channel.send(new CustomRichEmbed({
            title: 'Playing An MP3 File From Their Computer',
            description: `${'```'}\n${message_media.name}\n${'```'}`,
        }, message));
    }, () => {
        if (!message.deletable) return;
        message.delete().catch(console.warn);
    }, (error) => {
        console.trace(error);
    });
    guild_queue_manager.addItem(new QueueItem('mp3', player, `MP3`, {mp3_file_name: `${message_media.name}`}), (playnext ? 2 : undefined)).then(() => {
        if (guild_queue_manager.queue.length > 1) {
            message.channel.send(new CustomRichEmbed({
                title: 'Added An MP3 File From Their Computer',
                description: `${'```'}\n${message_media.name}\n${'```'}`,
            }, message));
        }
    });
}

//---------------------------------------------------------------------------------------------------------------//

function detect_broadcastify(search_query='') {
    return !!search_query.match(/((http|https)\:\/\/(www.)*(broadcastify\.com\/)(webPlayer|listen\/feed)\/\d+)/gi);
}

async function playBroadcastify(message, search_query, playnext=false) {
    const guild_queue_manager = message.client.$.queue_managers.get(message.guild.id);

    const broadcast_id = search_query.match(/(\d+)/)?.[0]; // the id should be numbers only
    if (!broadcast_id) throw new Error('Unable to retrieve Broadcastify Id from supplied user input!');

    const broadcastify_website_url = `https://www.broadcastify.com/listen/feed/${broadcast_id}`;
    const broadcastify_stream_url = `https://broadcastify.cdnstream1.com/${broadcast_id}`;

    const voice_connection = await createConnection(message.member.voice.channel);

    const stream_maker = () => `${broadcastify_stream_url}`;
    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 10.0, () => {
        if (guild_queue_manager.loop_enabled) return; // don't continue when queue looping is enabled

        message.channel.send(new CustomRichEmbed({
            title: 'Playing Broadcastify Stream',
            description: [
                `[Website Link - ${broadcast_id}](${broadcastify_website_url})`,
                `[Stream Link - ${broadcast_id}](${broadcastify_stream_url})`,
            ].join('\n'),
        }, message));
    }, () => {
        // end-of-playback callback
    }, (error) => {
        console.trace(error);
    });

    await guild_queue_manager.addItem(new QueueItem('other', player, 'Broadcastify Stream'), (playnext ? 2 : undefined));

    if (guild_queue_manager.queue.length > 1) {
        message.channel.send(new CustomRichEmbed({
            title: 'Added Broadcastify Stream',
            description: [
                `[Website Link - ${broadcast_id}](${broadcastify_website_url})`,
                `[Stream Link - ${broadcast_id}](${broadcastify_stream_url})`,
            ].join('\n'),
        }, message));
    }
}

//---------------------------------------------------------------------------------------------------------------//

async function get_spotify_access_token() {
    const base64_encoded_authorization = (new Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`)).toString('base64');

    const spotify_auth_response = await axios({
        url: 'https://accounts.spotify.com/api/token?grant_type=client_credentials',
        method: 'POST',
        headers: {
            'Authorization': `Basic ${base64_encoded_authorization}`,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });

    return spotify_auth_response.data.access_token;
}

function detect_spotify(search_query='') {
    return !!search_query.match(/((http|https)\:\/\/(open\.)*(spotify\.com\/)(track|album|playlist))/gi);
}

async function playSpotify(message, search_query, playnext=false) {
    let parsed_uri_data;
    try {
        parsed_uri_data = spotifyUri.parse(search_query);
    } catch (error) {
        console.error(error);
    }
    console.log('parsed_data', parsed_uri_data);

    if (!parsed_uri_data) {
        /* nothing could be parsed from the input */
        message.channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            title: 'Hmm',
            description: 'I don\'t think that was a valid spotify url!',
        }, message));
        return;
    }

    const spotify_access_token = await get_spotify_access_token();

    async function playSpotifyTrack(spotify_track_id) {
        const spotify_track_response = await axios.get(`https://api.spotify.com/v1/tracks/${spotify_track_id}?access_token=${spotify_access_token}`);
        console.log('spotify_track_response.data', spotify_track_response.data);

        const spotify_track_name = spotify_track_response.data.name;
        const spotify_artists_names = spotify_track_response.data.artists.map(artist => artist.name).join(', ');
        const spotify_track_name_by_artists = `${spotify_track_name} by ${spotify_artists_names}`;

        playYouTube(message, spotify_track_name_by_artists, playnext);
    }

    async function playSpotifyTracks(spotify_playlist_id, resource_type) {
        const spotify_playlist_response = await axios.get(`https://api.spotify.com/v1/${resource_type}s/${spotify_playlist_id}/tracks?access_token=${spotify_access_token}`);

        const track_ids = spotify_playlist_response.data.items.map(item => resource_type === 'playlist' ? item.track.id : item.id);

        const confirmation_embed = new CustomRichEmbed({
            title: `Do you want to play this playlist / album?`,
            description: `${'```'}fix\nWARNING! YOU CAN'T STOP A PLAYLIST / ALBUM FROM ADDING ITEMS!\n${'```'}`,
        }, message);

        sendOptionsMessage(message.channel.id, confirmation_embed, [
            {
                emoji_name: 'bot_emoji_checkmark',
                async callback(options_message, collected_reaction, user) {
                    await options_message.delete().catch(console.warn);

                    await options_message.channel.send(new CustomRichEmbed({
                        title: `Adding ${track_ids.length} item(s) to the queue!`,
                    }, message));

                    /* connect the bot to vc for the checks below to pass */
                    await createConnection(message.member.voice.channel);

                    let index = 0;
                    for (const track_id of track_ids) {
                        if (options_message.guild.me?.voice?.connection) {
                            if (index > 25) break; // don't add too many items
                            playSpotifyTrack(track_id);
                        } else {
                            break;
                        }
                        index++;
                        await Timer(60_000); // add an item every 60 seconds
                    }
                },
            }, {
                emoji_name: 'bot_emoji_close',
                async callback(options_message, collected_reaction, user) {
                    await options_message.delete().catch(console.warn);
                },
            },
        ], {
            confirmation_user_id: message.author.id,
        });
    }

    if (parsed_uri_data.type === 'playlist' || parsed_uri_data.type === 'album') {
        playSpotifyTracks(parsed_uri_data.id, parsed_uri_data.type);
    } else if (parsed_uri_data.type === 'track') {
        playSpotifyTrack(parsed_uri_data.id);
    } else {
        /* the parsed uri is not for a track or playlist */
        message.channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            title: 'That sucks!',
            description: 'I can only play spotify song/track urls!',
        }, message));
        return;
    }
}

//---------------------------------------------------------------------------------------------------------------//

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

    let soundcloud_song_info;
    try {
        soundcloud_song_info = await soundCloudDownloader.getInfo(search_query);
    } catch (error) {
        logUserError(message, error);
        throw error;
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
    const player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 1.0, () => {
        if (guild_queue_manager.loop_enabled) return; // don't continue when queue looping is enabled

        message.channel.send(new CustomRichEmbed({
            title: `Playing: ${soundcloud_song_info.title} (SoundCloud)`,
            description: `[${soundcloud_song_info.user.permalink_url}/${soundcloud_song_info.permalink}](${soundcloud_song_info.permalink_url})`,
        }, message));
    }, () => {
        // end-of-playback callback
    }, (error) => {
        console.trace(error);
    });

    await guild_queue_manager.addItem(new QueueItem('other', player, 'Soundcloud Stream'), (playnext ? 2 : undefined));

    if (guild_queue_manager.queue.length > 1) {
        message.channel.send(new CustomRichEmbed({
            title: `Added: ${soundcloud_song_info.title} (SoundCloud)`,
            description: `[${soundcloud_song_info.user.permalink_url}/${soundcloud_song_info.permalink}](${soundcloud_song_info.permalink_url})`,
        }, message));
    }
}

//---------------------------------------------------------------------------------------------------------------//

module.exports = new DisBotCommand({
    name: 'PLAY',
    category: `${DisBotCommander.categories.MUSIC}`,
    weight: 1,
    description: 'play music from youtube and more',
    aliases: [`play`, `p`, `playnext`, `pn`, ``],
    cooldown: 2_500,
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
        } else if (message_attachment) {
            playUserUploadedMP3(message, playnext);
        } else if (command_args.join('').length > 0) {
            if (await detect_remote_audio_stream(command_args.join(' '))) {
                playRemoteMP3(message, command_args.join(' '), playnext);
            } else if (detect_broadcastify(command_args.join(' '))) {
                playBroadcastify(message, command_args.join(' '), playnext);
            } else if (detect_spotify(command_args.join(' '))) {
                playSpotify(message, command_args.join(' '), playnext);
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
                        name: 'Playing Videos From YouTube:',
                        value: [
                            `${'```'}\n${discord_command} ussr national anthem\n${'```'}`,
                            `${'```'}\n${discord_command} https://youtu.be/U06jlgpMtQs\n${'```'}`,
                        ].join(''),
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
                        value: `${'```'}\n${discord_command}\n${'```'}(Don't forget to attach the \`.mp3\` file to the message)`,
                    },
                ],
                image: `${bot_cdn_url}/mp3_command_usage.png`,
            }, message));
        }
    },
});
