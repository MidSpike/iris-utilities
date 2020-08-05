'use strict';

require('dotenv').config();

const axios = require('axios');
const validator = require('validator');
const urlParser = require('url-parameter-parser');
const youtubeSearch = require('youtube-search');
const videoIdFromYouTubeURL = require(`parse-video-id-from-yt-url`);

const { Timer } = require('../utilities.js');

const { disBotServers } = require('./sharedVariables.js');
const { CustomRichEmbed } = require('./CustomRichEmbed.js');
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
            search_results = results ?? []; // Force an empty array if nullish
        } catch (error) {
            console.trace(error);
            throw error;
        } finally {
            if (search_results.length > 0) break;
            else current_search_attempt++;
            await Timer(1000 + current_search_attempt * 250);
        }
    }
    return search_results ?? []; // Force an empty array if nullish
}

/**
 * Plays music via youtube
 * @param {Message} message 
 * @param {String} search_query 
 * @param {Boolean} playnext 
 */
function playYouTube(message, search_query, playnext=false) {
    if (!message.member?.voice?.channel) {
        message.channel.send(new CustomRichEmbed({
            color:0xFFFF00,
            title:'Whoops!',
            description:'You need to be in a voice channel to use that command!'
        }, message));
        return;
    }
    const server = disBotServers[message.guild.id];
    const voice_channel = message.member.voice?.channel; // Store the current voice channel of the user
    if (!voice_channel) {
        message.channel.send(new CustomRichEmbed({
            color:0xFFFF00,
            title:'Woah there buddy!',
            description:'You need to join a voice channel first!'
        }));
        return;
    }
    message.channel.send(new CustomRichEmbed({title:'Searching YouTube For:', description:`${'```'}\n${search_query}${'```'}`})).then(async search_message => {
        async function _playYT(searchString, send_embed=true) {
            /**
             * Although it may seem better to route all searches for video_ids through the YT_API,
             * this is not the case... Offloading any amount from the API will help prevent exceeding quotas.
             * In short, do not remove the videoIdFromYouTubeURL function to make the code more 'elegant'.
             */
            let potentialVideoId;
            if (validator.isURL(searchString ?? '')) {// parse the id from the YT url
                try {
                    potentialVideoId = videoIdFromYouTubeURL(searchString);
                } catch {} // exceptions are thrown for non-youtube URLs, so just ignore them
            } else {// search for the video via the youtube api as a fallback
                const youtube_search_results = await forceYouTubeSearch(searchString, 1, 3);
                potentialVideoId = youtube_search_results[0]?.id;
            }
            if (potentialVideoId) {
                const youtube_playlist_api_response = await axios.get(`${bot_api_url}/ytinfo?video_id=${encodeURI(potentialVideoId)}`);
                const videoInfo = youtube_playlist_api_response?.data;
                const voice_connection = await createConnection(voice_channel);
                const streamMaker = async () => await `${bot_api_url}/ytdl?url=${encodeURIComponent(videoInfo.video_url)}`;
                if (!search_message.deleted) {
                    search_message.delete({timeout:500}).catch(null);
                }
                if (parseInt(videoInfo.length_seconds) === 0) {
                    message.channel.send(new CustomRichEmbed({
                        color:0xFFFF00,
                        title:'Woah there buddy!',
                        description:`Live streams aren't supported!`,
                        fields:[
                            {name:'Offending Live Stream Title', value:`${videoInfo.title}`},
                            {name:'Offending Live Stream URL', value:`${videoInfo.video_url}`}
                        ]
                    }, message));
                    return; // Don't allow live streams to play
                }
                const player = new QueueItemPlayer(server.queue_manager, voice_connection, streamMaker, undefined, () => {
                    sendYtDiscordEmbed(message, videoInfo, 'Playing');
                }, () => {
                    if (server.queue_manager.queue.length === 0 && server.queue_manager.autoplay_enabled) {
                        _playYT(`https://youtu.be/${array_random(videoInfo.related_videos.slice(0,3)).id}`)
                    }
                }, (error) => {
                    console.trace(`${error ?? 'Unknown Playback Error!'}`);
                });
                server.queue_manager.addItem(new QueueItem('youtube', player, `${videoInfo.title}`, {videoInfo:videoInfo}), (playnext ? 2 : undefined)).then(() => {
                    if (server.queue_manager.queue.length > 1 && send_embed) {
                        sendYtDiscordEmbed(message, videoInfo, 'Added');
                    }
                });
            } else {
                if (!search_message.deleted) {
                    search_message.delete({timeout:500}).catch(null);
                }
                message.channel.send(new CustomRichEmbed({
                    color:0xFFFF00,
                    title:`Uh Oh! ${message.author.username}`,
                    description:[
                        `Your search for the following failed to yield any results!${'```'}\n${searchString}\n${'```'}`,
                        `Try being a bit more specific next time or try searching again!`,
                        `\nSometimes YouTube gets excited by all of the searches and derps out!`
                    ].join('\n')
                }, message));
            }
        }
        const potentialPlaylistId = validator.isURL(search_query) ? urlParser(search_query)?.list : undefined;
        if (potentialPlaylistId) {
            const playlist_id_to_lookup = potentialPlaylistId;
            const yt_playlist_api_url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlist_id_to_lookup}&key=${process.env.YOUTUBE_API_TOKEN}`
            const yt_playlist_response = await axios.get(yt_playlist_api_url);
            const playlist_items = yt_playlist_response.data.items;
            if (!search_message.deleted) search_message.delete({timeout:500}).catch(null);
            const confirmEmbed = new CustomRichEmbed({
                title:`Are you sure that you want this to play as a playlist?`,
                description:`\`\`\`fix\nWARNING! YOU CAN NOT STOP A PLAYLIST FROM ADDING ITEMS!\n\`\`\`If you don't want this to play as a playlist, then click on the ${findCustomEmoji('bot_emoji_close')}.`
            }, message);
            sendOptionsMessage(message.channel.id, confirmEmbed, [
                {
                    emoji_name:'bot_emoji_checkmark',
                    callback:async (options_message, collected_reaction, user) => {
                        await options_message.delete({timeout:500}).catch(null);
                        await options_message.channel.send(new CustomRichEmbed({title:'Started playing as a playlist'}, message));
                        for (const index in playlist_items) {
                            if (index > 0 && !options_message.guild.me?.voice?.connection) break; // Stop the loop
                            const playlist_item = playlist_items[index];
                            const playlist_item_video_id = playlist_item.snippet.resourceId.videoId;
                            _playYT(playlist_item_video_id, false);
                            await Timer(10000); // Add an item every 10 seconds
                        }
                    }
                }, {
                    emoji_name:'bot_emoji_close',
                    callback:(options_message, collected_reaction, user) => {
                        options_message.edit(new CustomRichEmbed({title:'Started playing as a song'}, message));
                        _playYT(search_query);
                    }
                }
            ]);
        } else {
            _playYT(search_query); // This is not a playlist, so play it
        }
    });
}

module.exports = {
    forceYouTubeSearch,
    playYouTube,
};
