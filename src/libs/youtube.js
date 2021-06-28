'use strict';

const axios = require('axios');
const ytdl = require('ytdl-core');
const validator = require('validator');
const urlParser = require('url-parameter-parser');
const youtubeSearch = require('youtube-search');
const youtubeSearchBackup = require('yt-search');
const videoIdFromYouTubeURL = require(`parse-video-id-from-yt-url`);

const { Timer,
        array_random } = require('../utilities.js');

const { CustomRichEmbed } = require('./CustomRichEmbed.js');
const { findCustomEmoji } = require('./emoji.js');
const { createConnection } = require('./createConnection.js');
const { QueueItem,
        QueueItemPlayer } = require('./QueueManager.js');
const { sendOptionsMessage,
        sendYtDiscordEmbed } = require('./messages.js');
const { logUserError } = require('./errors.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_api_url = `${process.env.BOT_API_SERVER_URL}:${process.env.BOT_API_SERVER_PORT}`;

//---------------------------------------------------------------------------------------------------------------//

/**
 * Fetches a YouTube playlist id from a search query
 * @param {String} search_query any string that might contain a youtube url
 * @returns {String|undefined} a playlist id if successful
 */
async function get_potential_playlist_id_from_query(search_query) {
    return validator.isURL(search_query) ? urlParser(search_query)?.list : undefined;
}

/**
 * Fetches a YouTube video id from a search query
 * @param {String} search_query any string that might contain a youtube url
 * @returns {String|undefined} a youtube video id or undefined
 */
async function get_potential_video_id_from_query(search_query) {
    let potential_video_id;
    try {
        potential_video_id = videoIdFromYouTubeURL(search_query);
    } catch {
        /* exceptions are thrown for non-youtube URLs */
        potential_video_id = undefined;
    }
    return potential_video_id;
}

/**
 * Searches YouTube using the YT API and returns an array of search results.
 * If the YouTube API fails more than the specified number of retry_attempts,
 * then it will attempt one last time by scraping the YouTube website.
 * @param {String} search_query video, url, etc to look up on youtube
 * @param {Number} max_results the max number of results to return
 * @returns {Array<{id:String, link:String, title:String, channelTitle: String, channelId: String}>|undefined} 
 */
async function forceYouTubeSearch(search_query, max_results=5) {
    if (typeof search_query !== 'string') throw new TypeError('\`search_query\` must be a string!');
    if (isNaN(max_results)) throw new TypeError('\`max_results\` must be a number!');
    if (Math.floor(max_results) !== max_results || max_results < 1) throw RangeError('\`max_results\` must be a whole number and at least \`1\`!');

    console.time(`BENCHMARK: forceYouTubeSearch; ${search_query}`);

    let search_results = [];

    const potential_video_id = await get_potential_video_id_from_query(search_query);
    console.log({ potential_video_id });

    /* try to use the official YouTube APIs */
    if (potential_video_id) {
        /* uses the `https://www.googleapis.com/youtube/v3/videos` api */
        try {
            const { data: { items: primary_search_results } } = await axios.get(`https://www.googleapis.com/youtube/v3/videos?part=id,snippet&regionCode=US&maxResults=1&id=${encodeURIComponent(potential_video_id)}&key=${encodeURIComponent(process.env.YOUTUBE_API_TOKEN)}`);
            console.log('primary_search_results.length', primary_search_results.length);
            search_results = primary_search_results;
        } catch (error) {
            console.warn('Failed YouTube API Videos Lookup!', error);
        }
    } else {
        /* uses the `https://www.googleapis.com/youtube/v3/search` api */
        try {
            const { results: primary_search_results } = await youtubeSearch(search_query, {
                maxResults: max_results,
                type: 'video',
                regionCode: 'US',
                key: process.env.YOUTUBE_API_TOKEN,
            });
            console.log('primary_search_results.length', primary_search_results.length);
            search_results = primary_search_results;
        } catch (error) {
            console.warn('Failed YouTube API Search Lookup!', error);
        }
    }

    /* fallback to scraping the youtube website for results */
    if (search_results.length === 0) {
        console.warn('forceYouTubeSearch: Fallback method is active!');

        const { videos: backup_search_results } = await youtubeSearchBackup(search_query);
        console.log('backup_search_results.length', backup_search_results.length);

        /* map the unofficial backup results to partially match the primary results scheme */
        search_results = backup_search_results.map(({ videoId, url, title, author }) => ({
            id: `${videoId}`,
            link: `${url}`,
            title: `${title}`,
            channelTitle: `${author.name}`,
            channelId: `${author.url.replace(/(.*\/)/gi, '')}`,
        }));
    }

    console.timeEnd(`BENCHMARK: forceYouTubeSearch; ${search_query}`);

    return (search_results ?? []).slice(0, max_results);
}

/**
 * Plays music via youtube
 * @param {Message} message 
 * @param {String} search_query 
 * @param {Boolean} playnext 
 */
async function playYouTube(message, search_query, playnext=false) {
    const voice_channel = message.member.voice.channel;

    const guild_queue_manager = message.guild.client.$.queue_managers.get(message.guild.id);

    async function _play_as_video(search_query, send_embed=true) {
        console.log('_play_as_video:', { search_query, send_embed });

        const [ potential_video ] = await forceYouTubeSearch(search_query, 1);
        if (!potential_video) {
            search_message.edit(new CustomRichEmbed({
                color: 0xFFFF00,
                title: `Uh Oh! ${message.author.username}`,
                description: [
                    `Your search for the following failed to yield any results!${'```'}\n${search_query}\n${'```'}`,
                    'Try being a bit more specific next time or try searching again!',
                    '\n',
                    'Sometimes YouTube gets excited by all of the searches and derps out!',
                ].join('\n'),
            }, message)).catch(console.warn);
            return;
        }

        const video_id = potential_video.id;

        let voice_connection;
        try {
            voice_connection = await createConnection(voice_channel);
        } catch (error) {
            console.trace(error);
            search_message.edit(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Well that\'s an issue!',
                description: 'I was unable to join your voice channel!',
            }, message)).catch(console.warn);
        } finally {
            if (!voice_connection) return; // there is no point in continuing if the bot can't join the voice channel
        }

        const { data: yt_video_info } = await axios.get(`${bot_api_url}/ytinfo?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&video_id=${encodeURI(video_id)}`);

        if (!yt_video_info.videoDetails) {
            logUserError(message, new Error('\`yt_video_info.videoDetails\` is not defined!'));
            return;
        }

        /* detect live-streams */
        const is_livestream = yt_video_info.videoDetails.isLiveContent;

        const stream_maker = async () => ytdl(`https://youtu.be/${video_id}`, {
            lang: 'en',
            filter: (is_livestream ? undefined : 'audioonly'),
            quality: (is_livestream ? [128, 127, 120, 96, 95, 94, 93] : 'highestaudio'),
            highWaterMark: 1<<25, // 32 MB
            requestOptions: {
                headers: {
                    'Accept-Language': 'en-US,en;q=0.5',
                    'User-Agent': process.env.YTDL_USER_AGENT,
                    'Cookie': process.env.YTDL_COOKIE,
                    'x-youtube-identity-token': process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN,
                },
            },
        });

        const queue_item_player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 0.5, () => {
            if (!guild_queue_manager.loop_enabled) {
                /* don't send messages when looping */
                sendYtDiscordEmbed(message, yt_video_info, 'Playing');
            }
        }, async () => {
            /* handle queue autoplay for youtube videos */
            if (guild_queue_manager.autoplay_enabled && guild_queue_manager.queue.length === 0) {
                async function find_related_video_id() {
                    const { data: { items: related_videos } } = await axios.get(`https://youtube.googleapis.com/youtube/v3/search?part=id&maxResults=10&relatedToVideoId=${encodeURIComponent(yt_video_info.videoDetails.videoId)}&type=video&key=${encodeURIComponent(process.env.YOUTUBE_API_TOKEN)}`);

                    /* for some damn reason the first item is NEVER playable */
                    const playable_related_videos = related_videos.slice(1);

                    const { id: { videoId: random_related_video_id } } = array_random(playable_related_videos);

                    return random_related_video_id;
                }

                async function play_related_video() {
                    const related_video_id = await find_related_video_id();

                    /* yes, I know that this is a dumb way to handle 'unavailable' videos */
                    if (related_video_id) {
                        _play_as_video(`https://youtu.be/${related_video_id}`);
                    } else {
                        play_related_video();
                    }
                }

                play_related_video();
            }
            return; // complete async
        }, (error) => {
            console.trace('YouTube Error:', error ?? 'Unknown Playback Error!');
            logUserError(message, error ?? 'Unknown Playback Error!');
        });

        const queue_item = new QueueItem('youtube', queue_item_player, `${yt_video_info.videoDetails.title}`, {
            videoInfo: yt_video_info,
        });

        await guild_queue_manager.addItem(queue_item, (playnext ? 2 : undefined));

        if (guild_queue_manager.queue.length > 1 && send_embed) {
            sendYtDiscordEmbed(message, yt_video_info, 'Added');
        }

        if (search_message.deletable) {
            search_message.delete().catch(console.warn);
        }

        return; // complete async
    }

    async function _play_as_playlist(playlist_id, video_id) {
        const { data: { items: playlist_items } } = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${playlist_id}&key=${process.env.YOUTUBE_API_TOKEN}`);

        const confirmation_embed = new CustomRichEmbed({
            title: `Do you want this to play all ${playlist_items.length} items in this playlist?`,
            description: [
                `${'```'}fix\nWARNING! YOU CAN'T STOP A PLAYLIST FROM ADDING ITEMS!\n${'```'}`,
                `**If you want this to play as a song; click on the ${(await findCustomEmoji('bot_emoji_close'))}.**`,
            ].join('\n'),
        }, message);

        sendOptionsMessage(message.channel.id, confirmation_embed, [
            {
                emoji_name: 'bot_emoji_checkmark',
                async callback(options_message, collected_reaction, user) {
                    await options_message.delete().catch(console.warn);

                    await search_message.edit(new CustomRichEmbed({
                        title: `Adding ${playlist_items.length} item(s) to the queue!`,
                    }, message)).catch(console.warn);

                    /* connect the bot to vc for the checks below to pass */
                    await createConnection(message.member.voice.channel);

                    let index = 0;
                    for (const playlist_item of playlist_items) {
                        /* make sure the bot is still in a voice channel */
                        if (options_message.guild.me?.voice?.connection) {
                            if (index > 20) break; // don't add too many items
                            const playlist_item_video_id = playlist_item.snippet.resourceId.videoId;
                            _play_as_video(playlist_item_video_id, false);
                        } else {
                            break;
                        }
                        index++;
                        await Timer(120_000); // add an item every 2 minutes
                    }
                },
            }, {
                emoji_name: 'bot_emoji_close',
                async callback(options_message, collected_reaction, user) {
                    await options_message.delete().catch(console.warn);
                    _play_as_video(`https://youtu.be/${video_id}`);
                },
            },
        ], {
            confirmation_user_id: message.author.id,
        });
    }

    const search_message = await message.channel.send(new CustomRichEmbed({
        title: 'Searching YouTube For:',
        description: `${'```'}\n${search_query}\n${'```'}`,
    }));

    const potential_playlist_id = await get_potential_playlist_id_from_query(search_query);
    const potential_video_id = await get_potential_video_id_from_query(search_query);

    if (potential_playlist_id && potential_video_id) {
        _play_as_playlist(potential_playlist_id, potential_video_id);
    } else {
        _play_as_video(search_query);
    }
}

module.exports = {
    forceYouTubeSearch,
    playYouTube,
};
