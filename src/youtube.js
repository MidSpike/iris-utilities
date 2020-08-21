'use strict';

const axios = require('axios');
const validator = require('validator');
const urlParser = require('url-parameter-parser');
const youtubeSearch = require('youtube-search');
const ytSearchBackup = require('yt-search');
const videoIdFromYouTubeURL = require(`parse-video-id-from-yt-url`);

const { Timer, array_random } = require('../utilities.js');

const { disBotServers } = require('./SHARED_VARIABLES.js');
const { CustomRichEmbed } = require('./CustomRichEmbed.js');
const { findCustomEmoji } = require('./emoji.js');
const { QueueItem, QueueItemPlayer } = require('./QueueManager.js');
const { createConnection } = require('./createConnection.js');
const { sendOptionsMessage, sendYtDiscordEmbed } = require('./messages.js');

//---------------------------------------------------------------------------------------------------------------//

const bot_api_url = process.env.BOT_API_SERVER_URL;

//---------------------------------------------------------------------------------------------------------------//

/**
 * Searches YouTube using the YT API and returns an array of search results
 * @param {String} search_query video, url, etc to look up on youtube
 * @param {Number} max_results 
 * @param {Number} retry_attempts 
 * @returns {Array<Object>|undefined}
 */
async function forceYouTubeSearch(search_query, max_results=5, retry_attempts=3) {
    if (typeof search_query !== 'string') throw new TypeError('`search_query` must be a string!');
    if (isNaN(max_results)) throw new TypeError('`max_results` must be a number!');
    if (Math.floor(max_results) !== max_results || max_results < 1) throw RangeError('`max_results` must be a whole number and at least `1`!');
    if (isNaN(retry_attempts)) throw new TypeError('`retry_attempts` must be positive whole number above zero!');
    if (Math.floor(retry_attempts) !== retry_attempts || retry_attempts < 1) throw RangeError('`retry_attempts` must be a whole number and at least `1`!');

    let current_search_attempt = 1;
    let search_results;
    while (current_search_attempt <= retry_attempts) {
        try {
            const { results } = await youtubeSearch(search_query, {
                maxResults: max_results,
                type: 'video',
                regionCode: 'US',
                key: process.env.YOUTUBE_API_TOKEN
            });
            search_results = results;
        } catch (error) {
            console.warn(`Failed YouTube API Lookup!`);
        } finally {
            if (search_results?.length > 0) break;
            else current_search_attempt++;
            await Timer(1000 + current_search_attempt * 250);
        }
    }
    let backup_search_results = [];
    if (!(search_results?.length > 0)) { // search_results is nullish or empty
        console.warn(`YOUTUBE API RATE LIMIT HANDLER ACTIVE!`);
        const back_up_result = await ytSearchBackup(search_query);
        const re_mapped_results = back_up_result.videos.map(video_result => ({
            id: video_result.videoId,
            link: video_result.url,
            title: video_result.title
        }));
        backup_search_results = re_mapped_results;
    }
    return search_results ?? backup_search_results ?? []; // Force an empty array if nullish
}

/**
 * Plays music via youtube
 * @param {Message} message 
 * @param {String} search_query 
 * @param {Boolean} playnext 
 */
async function playYouTube(message, search_query, playnext=false) {
    const server = disBotServers[message.guild.id];
    const voice_channel = message.member.voice.channel;

    async function _get_playlist_id_from_query(query) {
        return validator.isURL(query) ? urlParser(query)?.list : undefined;
    }

    async function _get_video_id_from_query(query) {
        let possible_video_id;
        if (validator.isURL(query ?? '')) {// parse the id from the YT url
            try {
                possible_video_id = videoIdFromYouTubeURL(query);
            } catch {} // exceptions are thrown for non-youtube URLs, so just ignore them
        } else { // search for the video via the youtube api as a fallback
            console.time(`_get_video_id_from_query: forceYouTubeSearch`);
            const youtube_search_results = await forceYouTubeSearch(query, 1, 3);
            console.timeEnd(`_get_video_id_from_query: forceYouTubeSearch`);
            possible_video_id = youtube_search_results[0]?.id;
        }
        return possible_video_id;
    }

    async function _play_as_video(video_id, send_embed=true) {
        const youtube_playlist_api_response = await axios.get(`${bot_api_url}/ytinfo?video_id=${encodeURI(video_id)}`);
        const yt_video_info = youtube_playlist_api_response?.data;
        const voice_connection = await createConnection(voice_channel);
        const streamMaker = async () => await `${bot_api_url}/ytdl?url=${encodeURIComponent(yt_video_info.videoDetails.video_url)}`;
        if (parseInt(yt_video_info.length_seconds) === 0) {
            message.channel.send(new CustomRichEmbed({
                color:0xFFFF00,
                title:'Woah there buddy!',
                description:`Live streams aren't supported!`,
                fields:[
                    {name:'Offending Live Stream Title', value:`${yt_video_info.videoDetails.title}`},
                    {name:'Offending Live Stream URL', value:`${yt_video_info.videoDetails.video_url}`}
                ]
            }, message));
            return; // Don't allow live streams to play
        }
        if (!search_message.deleted) {
            search_message.delete({timeout:500}).catch(console.warn);
        }
        const player = new QueueItemPlayer(server.queue_manager, voice_connection, streamMaker, 1.0, () => {
            sendYtDiscordEmbed(message, yt_video_info, 'Playing');
        }, async () => {
            if (server.queue_manager.queue.length === 0 && server.queue_manager.autoplay_enabled) {
                await _play_as_video(array_random(yt_video_info.related_videos.slice(0, 3)).id);
            }
            return; // Complete async
        }, (error) => {
            console.trace(`${error ?? 'Unknown Playback Error!'}`);
        });
        await server.queue_manager.addItem(new QueueItem('youtube', player, `${yt_video_info.title}`, {videoInfo:yt_video_info}), (playnext ? 2 : undefined)).then(() => {
            if (server.queue_manager.queue.length > 1 && send_embed) {
                sendYtDiscordEmbed(message, yt_video_info, 'Added');
            }
        });
        return; // Complete async
    }

    async function _play_as_playlist(playlist_id) {
        const yt_playlist_api_url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${playlist_id}&key=${process.env.YOUTUBE_API_TOKEN}`;
        const yt_playlist_response = await axios.get(yt_playlist_api_url);
        const playlist_items = yt_playlist_response.data.items;
        if (!search_message.deleted) {
            search_message.delete({timeout:500}).catch(console.warn);
        }
        const confirmEmbed = new CustomRichEmbed({
            title:`Do you want this to play as a playlist?`,
            description:[
                `${'```'}fix\nWARNING! YOU CAN'T STOP A PLAYLIST FROM ADDING ITEMS!\n${'```'}`,
                `**If you want this to play as a song, then click on the ${findCustomEmoji('bot_emoji_close')}.**`
            ].join('\n')
        }, message);
        sendOptionsMessage(message.channel.id, confirmEmbed, [
            {
                emoji_name:'bot_emoji_checkmark',
                callback:async (options_message, collected_reaction, user) => {
                    await options_message.delete({timeout:500}).catch(console.warn);
                    await options_message.channel.send(new CustomRichEmbed({title:'Started playing as a playlist'}, message));
                    for (const index in playlist_items) {
                        if (index > 0 && !options_message.guild.me?.voice?.connection) break; // Stop the loop
                        const playlist_item = playlist_items[index];
                        const playlist_item_video_id = playlist_item.snippet.resourceId.videoId;
                        _play_as_video(playlist_item_video_id, false);
                        await Timer(10000); // Add an item every 10 seconds
                    }
                }
            }, {
                emoji_name:'bot_emoji_close',
                callback:async (options_message, collected_reaction, user) => {
                    options_message.delete({timeout:500}).catch(console.warn);
                    _play_as_video(await _get_video_id_from_query(search_query));
                }
            }
        ]);
    }

    const search_message = await message.channel.send(new CustomRichEmbed({
        title:'Searching YouTube For:',
        description:`${'```'}\n${search_query}\n${'```'}`
    }));

    const potential_playlist_id = await _get_playlist_id_from_query(search_query);
    const potential_video_id = await _get_video_id_from_query(search_query);

    if (potential_playlist_id) { // The search_query was a playlist
        try {
            await _play_as_playlist(potential_playlist_id);
        } catch {
            console.warn(`Issues with YouTube API detected... Falling-back to normal video playback!`);
            await _play_as_video(potential_video_id);
        }
    } else if (potential_video_id) { // The search_query is a video
        await _play_as_video(potential_video_id);
    } else {
        if (!search_message.deleted) search_message.delete({timeout:500}).catch(console.warn);
        message.channel.send(new CustomRichEmbed({
            color:0xFFFF00,
            title:`Uh Oh! ${message.author.username}`,
            description:[
                `Your search for the following failed to yield any results!${'```'}\n${search_query}\n${'```'}`,
                `Try being a bit more specific next time or try searching again!`,
                `\nSometimes YouTube gets excited by all of the searches and derps out!`
            ].join('\n')
        }, message));
    }
}

module.exports = {
    forceYouTubeSearch,
    playYouTube,
};
