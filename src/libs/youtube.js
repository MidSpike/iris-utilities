'use strict';

const axios = require('axios');
const ytdl = require('ytdl-core');
const validator = require('validator');
const urlParser = require('url-parameter-parser');
const youtubeSearch = require('youtube-search');
const ytSearchBackup = require('yt-search');
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

const bot_api_url = process.env.BOT_API_SERVER_URL;

//---------------------------------------------------------------------------------------------------------------//

/**
 * Searches YouTube using the YT API and returns an array of search results.
 * If the YouTube API fails more than the specified number of retry_attempts,
 * then it will attempt one last time by scraping the YouTube website.
 * @param {String} search_query video, url, etc to look up on youtube
 * @param {Number} max_results the max number of results to ask the YouTube API for
 * @param {Number} retry_attempts the amount of Official YouTube API retry attempts
 * @returns {Array<{id:String, link:String, title:String}>|undefined} the number of results is not based on max_results
 */
async function forceYouTubeSearch(search_query, max_results=5, retry_attempts=1) {
    if (typeof search_query !== 'string') throw new TypeError('`search_query` must be a string!');
    if (isNaN(max_results)) throw new TypeError('`max_results` must be a number!');
    if (Math.floor(max_results) !== max_results || max_results < 1) throw RangeError('`max_results` must be a whole number and at least `1`!');
    if (isNaN(retry_attempts)) throw new TypeError('`retry_attempts` must be positive whole number above zero!');
    if (Math.floor(retry_attempts) !== retry_attempts || retry_attempts < 1) throw RangeError('`retry_attempts` must be a whole number and at least `1`!');

    console.time(`BENCHMARK: forceYouTubeSearch; ${search_query}`);

    /* try using the YouTube API results */
    let current_search_attempt = 1;
    let search_results = [];
    while (current_search_attempt <= retry_attempts) {
        try {
            const { results } = await youtubeSearch(search_query, {
                maxResults: max_results,
                type: 'video',
                regionCode: 'US',
                key: process.env.YOUTUBE_API_TOKEN,
            });
            search_results = results;
        } catch (error) {
            console.warn(`Failed YouTube API Lookup!`);
        } finally {
            if (search_results.length > 0) break;
            else current_search_attempt++;
            await Timer(1000 + current_search_attempt * 250);
        }
    }

    /* fallback to scraping the youtube website results */
    if (search_results.length === 0) {
        console.warn(`YOUTUBE API RATE LIMIT HANDLER ACTIVE!`);
        const { videos: backup_search_results } = await ytSearchBackup(search_query);

        /* map the unofficial backup results to match the primary results scheme */
        search_results = backup_search_results.map(({ videoId, url, title }) => ({
            id: `${videoId}`,
            link: `${url}`,
            title: `${title}`,
        }));
    }

    console.timeEnd(`BENCHMARK: forceYouTubeSearch; ${search_query}`);
    return search_results ?? []; // force an empty array if nullish
}

/**
 * Plays music via youtube
 * @param {Message} message 
 * @param {String} search_query 
 * @param {Boolean} playnext 
 */
async function playYouTube(message, search_query, playnext=false) {
    const guild_queue_manager = message.guild.client.$.queue_managers.get(message.guild.id);

    const voice_channel = message.member.voice.channel;

    /**
     * Fetches a YouTube playlist id from a search query
     * @param {String} query any string that might contain a youtube url or search query
     * @returns {String|undefined} a playlist id if successful
     */
    async function _get_playlist_id_from_query(query) {
        return validator.isURL(query) ? urlParser(query)?.list : undefined;
    }

    /**
     * Fetches a YouTube video id from a search query
     * @param {String} query any string that might contain a youtube url or search query
     * @returns {String|undefined} a youtube video id or undefined
     */
    async function _get_video_id_from_query(query) {
        let possible_video_id;
        if (validator.isURL(query ?? '')) { // parse the id from the YT url
            try {
                possible_video_id = videoIdFromYouTubeURL(query);
            } catch {
                /* exceptions are thrown for non-youtube URLs */
                possible_video_id = undefined;
            }
        } else { // search for the video via the youtube api as a fallback
            const youtube_search_results = await forceYouTubeSearch(query, 1, 3);
            possible_video_id = youtube_search_results[0]?.id;
        }
        return possible_video_id;
    }

    async function _play_as_video(video_id, send_embed=true) {
        if (!video_id) throw new Error(`'video_id' must be defined`);

        let voice_connection;
        try {
            voice_connection = await createConnection(voice_channel);
        } catch {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Whelp that\'s an issue!',
                description: 'I\'m unable to join your voice channel!',
            }, message));
        } finally {
            if (!voice_connection) return; // there is no point in continuing if the bot can't join vc
        }

        const bot_api_response = await axios.get(`${bot_api_url}/ytinfo?token=${encodeURIComponent(process.env.BOT_API_SERVER_TOKEN)}&video_id=${encodeURI(video_id)}`);
        const yt_video_info = bot_api_response?.data;

        if (!yt_video_info.videoDetails) {
            logUserError(message, new Error('\`yt_video_info.videoDetails\` is not defined!'));
            return;
        }

        if (parseInt(yt_video_info.videoDetails.lengthSeconds) === 0) {
            message.channel.send(new CustomRichEmbed({
                color: 0xFFFF00,
                title: 'Woah there buddy!',
                description: 'Live streams aren\'t supported!',
                fields: [
                    {
                        name: 'Offending Live Stream Title',
                        value: `${yt_video_info.videoDetails.title}`
                    }, {
                        name: 'Offending Live Stream URL',
                        value: `${yt_video_info.videoDetails.video_url}`
                    },
                ],
            }, message));
            return; // don't allow live streams to play... live streams are buggy
        }

        if (!search_message.deleted) {
            await search_message.delete({timeout: 500}).catch(console.warn);
        }

        const stream_maker = async () => {
            const ytdl_stream = ytdl(`https://youtu.be/${video_id}`, {
                lang: 'en',
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1<<25, // 32 MB
            });
            return ytdl_stream;
        };

        const queue_item_player = new QueueItemPlayer(guild_queue_manager, voice_connection, stream_maker, 1.0, () => {
            sendYtDiscordEmbed(message, yt_video_info, 'Playing');
        }, async () => {
            /* handle queue autoplay for youtube videos */
            if (guild_queue_manager.queue.length === 0 && guild_queue_manager.autoplay_enabled) {
                const random_related_video = array_random(yt_video_info.related_videos.slice(0, 3));
                await _play_as_video(random_related_video.id);
            }
            return; // complete async
        }, (error) => {
            console.trace(`${error ?? 'Unknown Playback Error!'}`);
        });

        const queue_item = new QueueItem('youtube', queue_item_player, `${yt_video_info.videoDetails.title}`, {
            videoInfo: yt_video_info
        });

        await guild_queue_manager.addItem(queue_item, (playnext ? 2 : undefined));

        if (guild_queue_manager.queue.length > 1 && send_embed) {
            sendYtDiscordEmbed(message, yt_video_info, 'Added');
        }

        return; // complete async
    }

    async function _play_as_playlist(playlist_id) {
        const yt_playlist_api_url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlist_id}&key=${process.env.YOUTUBE_API_TOKEN}`;
        const yt_playlist_response = await axios.get(yt_playlist_api_url);

        const playlist_items = yt_playlist_response.data.items;

        if (!search_message.deleted) {
            await search_message.delete({timeout: 500}).catch(console.warn);
        }

        const confirmation_embed = new CustomRichEmbed({
            title: `Do you want this to play as a playlist?`,
            description: [
                `${'```'}fix\nWARNING! YOU CAN'T STOP A PLAYLIST FROM ADDING ITEMS!\n${'```'}`,
                `**If you want this to play as a song; click on the ${findCustomEmoji('bot_emoji_close')}.**`,
            ].join('\n'),
        }, message);

        sendOptionsMessage(message.channel.id, confirmation_embed, [
            {
                emoji_name: 'bot_emoji_checkmark',
                async callback(options_message, collected_reaction, user) {
                    await options_message.delete({timeout: 500}).catch(console.warn);

                    await options_message.channel.send(new CustomRichEmbed({
                        title: `Started adding ${playlist_items.length} item(s) to the playlist!`,
                    }, message));

                    /* connect the bot to vc for the checks below to pass */
                    await createConnection(voice_channel);

                    for (const playlist_item of playlist_items) {
                        /* make sure the bot is still in a voice channel */
                        if (options_message.guild.me?.voice?.connection) {
                            const playlist_item_video_id = playlist_item.snippet.resourceId.videoId;
                            _play_as_video(playlist_item_video_id, false);
                        } else {
                            break;
                        }
                        await Timer(10_000); // add an item every 10 seconds
                    }
                },
            }, {
                emoji_name: 'bot_emoji_close',
                async callback(options_message, collected_reaction, user) {
                    await options_message.delete({timeout: 500}).catch(console.warn);

                    const potential_video_id = await _get_video_id_from_query(search_query);
                    if (potential_video_id) {
                        _play_as_video(potential_video_id);
                    } else {
                        if (!search_message.deleted) {
                            await search_message.delete({timeout: 500}).catch(console.warn);
                        }

                        message.channel.send(new CustomRichEmbed({
                            color: 0xFFFF00,
                            title: `Uh Oh! ${message.author.username}`,
                            description: `I'm unable to play that!`,
                        }, message));
                    }
                },
            },
        ], message.author.id);
    }

    const search_message = await message.channel.send(new CustomRichEmbed({
        title: 'Searching YouTube For:',
        description: `${'```'}\n${search_query}\n${'```'}`,
    }));

    const potential_playlist_id = await _get_playlist_id_from_query(search_query);
    const potential_video_id = await _get_video_id_from_query(search_query);

    if (potential_playlist_id) { // the search_query was a playlist
        try {
            await _play_as_playlist(potential_playlist_id);
        } catch {
            console.warn(`Issues with YouTube API detected... Falling-back to normal video playback!`);
            await _play_as_video(potential_video_id);
        }
    } else if (potential_video_id) { // the search_query is a video
        await _play_as_video(potential_video_id);
    } else { // the search_query is unknown
        if (!search_message.deleted) {
            await search_message.delete({timeout: 500}).catch(console.warn);
        }

        message.channel.send(new CustomRichEmbed({
            color: 0xFFFF00,
            title: `Uh Oh! ${message.author.username}`,
            description: [
                `Your search for the following failed to yield any results!${'```'}\n${search_query}\n${'```'}`,
                'Try being a bit more specific next time or try searching again!',
                '\n',
                'Sometimes YouTube gets excited by all of the searches and derps out!',
            ].join('\n'),
        }, message));
    }
}

module.exports = {
    forceYouTubeSearch,
    playYouTube,
};
