//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GuildId } from '@root/types/index';

import process from 'node:process';

import * as SoundCloud from 'soundcloud-scraper';

import * as ytdl from 'ytdl-core';

import { YouTube as YoutubeSearch } from 'youtube-sr';

import * as DiscordVoice from '@discordjs/voice';

import * as Discord from 'discord.js';

import * as QueueSpace from './queue/queue';

import * as TrackSpace from './track/track';

import * as StreamerSpace from './streamer/streamer';

import { delay, parseUrlFromString } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const ytdl_user_agent = process.env.YTDL_USER_AGENT as string;
if (!ytdl_user_agent?.length) throw new Error('YTDL_USER_AGENT is not defined or is empty');

const ytdl_cookie = process.env.YTDL_COOKIE as string;
if (!ytdl_cookie?.length) throw new Error('YTDL_COOKIE is not defined or is empty');

const ytdl_x_youtube_identity_token = process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN as string;
if (!ytdl_x_youtube_identity_token?.length) throw new Error('YTDL_X_YOUTUBE_IDENTITY_TOKEN is not defined or is empty');

//------------------------------------------------------------//

const youtube_request_options = {
    headers: {
        'Accept-Language': 'en-US,en;q=0.5',
        'User-Agent': ytdl_user_agent,
        'Cookie': ytdl_cookie,
        'x-youtube-identity-token': ytdl_x_youtube_identity_token,
    },
};

//------------------------------------------------------------//

const sc_client = new SoundCloud.Client();

//------------------------------------------------------------//

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
export class MusicSubscription {
    private _locked = false;

    readonly text_channel: Discord.TextBasedChannel;

    readonly voice_connection: DiscordVoice.VoiceConnection;

    readonly audio_player: DiscordVoice.AudioPlayer;

    readonly queue = new QueueSpace.Queue();

    constructor({
        voice_connection,
        text_channel,
    }: {
        voice_connection: DiscordVoice.VoiceConnection,
        text_channel: Discord.TextBasedChannel,
    }) {
        const audio_player = DiscordVoice.createAudioPlayer();

        audio_player.on('error', (error) => {
            console.trace(error);

            this.queue.current_track?.triggerOnError(error); // notify the track that it has errored

            this.processQueue(true); // advance the queue to the next track
        });

        audio_player.on('stateChange', async (oldState, newState) => {
            if (
                oldState.status !== DiscordVoice.AudioPlayerStatus.Idle &&
                newState.status === DiscordVoice.AudioPlayerStatus.Idle
            ) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                this.queue.current_track?.triggerOnFinish(); // notify the track that it has finished playing
                this.processQueue(false); // advance the queue to the next track
            } else if (newState.status === DiscordVoice.AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                this.queue.current_track?.triggerOnStart(); // notify the track that it has started playing
                this.queue.volume_manager.initialize(); // initialize the volume manager for each track
            }
        });

        voice_connection.on('error', (error) => {
            console.trace('MusicSubscription: VoiceConnection error', error);
        });

        voice_connection.on('stateChange', async (oldState, newState) => {
            switch (newState.status) {
                case DiscordVoice.VoiceConnectionStatus.Disconnected: {
                    const was_disconnected_by_websocket = newState.reason === DiscordVoice.VoiceConnectionDisconnectReason.WebSocketClose;
                    if (was_disconnected_by_websocket && newState.closeCode === 4014) {
                        /**
                         * If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
                         * but there is a chance the connection will recover itself if the reason of the disconnect was due to
                         * switching voice channels. This is also the same code for the bot being kicked from the voice channel,
                         * so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
                         * the voice connection.
                         */
                        try {
                            await DiscordVoice.entersState(voice_connection, DiscordVoice.VoiceConnectionStatus.Connecting, 5_000);
                        } catch {
                            voice_connection.destroy();
                        }

                        break;
                    }

                    /**
                     * Attempt to manually rejoin the voice connection.
                     * Wait 5 seconds before attempting each reconnect.
                     */
                    if (voice_connection.rejoinAttempts < 5) {
                        await delay((voice_connection.rejoinAttempts + 1) * 5_000);

                        voice_connection.rejoin();

                        break;
                    }

                    voice_connection.destroy();

                    break;
                }

                case DiscordVoice.VoiceConnectionStatus.Destroyed: {
                    /**
                     * if the connection is destroyed, kill the music subscription.
                     */
                    this.kill();

                    break;
                }

                case DiscordVoice.VoiceConnectionStatus.Connecting:
                case DiscordVoice.VoiceConnectionStatus.Signalling: {
                    if (this._locked) break;
                    this._locked = true;

                    try {
                        /**
                         * Wait 20 seconds for the connection to become ready before destroying the voice connection.
                         * This prevents the voice connection from permanently existing in one of these states.
                         */
                        await DiscordVoice.entersState(voice_connection, DiscordVoice.VoiceConnectionStatus.Ready, 20_000);
                    } catch {
                        voice_connection.destroy();
                    } finally {
                        this._locked = false;
                    }

                    break;
                }

                default: {
                    break;
                }
            }
        });

        voice_connection.subscribe(audio_player);

        this.audio_player = audio_player;
        this.text_channel = text_channel;
        this.voice_connection = voice_connection;
    }

    /**
     * Stops and resets the queue.
     */
    stop() {
        this.audio_player.stop(true);
        this.queue.reset();
    }

    /**
     * Stops and resets the queue then disconnects the voice connection.
     */
    kill() {
        this.stop();
        this.voice_connection.disconnect(); // `disconnect` instead of `destroy` to avoid an infinite loop
    }

    /**
     * Attempts to play a track from the queue.
     * @param force Whether to force the queue to be processed, even if not idling.
     */
    async processQueue(
        force: boolean = false,
    ) {
        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) return;

        // Check if the audio player is idle, and if not, don't process the queue without forcing.
        if (!force && this.audio_player.state.status !== DiscordVoice.AudioPlayerStatus.Idle) return;

        // Pause the audio player if we are forcing the queue to be processed
        if (force) this.audio_player.pause(true);

        // Get the next track from the queue
        const next_track = await this.queue.processNextTrack();
        if (!next_track) return;

        // Get the track's audio resource
        const next_track_resource = await next_track.initializeResource();
        if (!next_track_resource) return;

        // Play the next track
        this.audio_player.play(next_track_resource);
    }
}

//------------------------------------------------------------//

type ResourceInfo = {
    title: string;
    url: string;
};

enum SearchTrigger {
    Youtube = 'youtube',
    YoutubeShortened = 'yt',
    SoundCloud = 'soundcloud',
    SoundCloudShortened = 'sc',
}

export class MusicReconnaissance {
    private static async searchWithYouTube(
        query: string,
    ): Promise<TrackSpace.RemoteTrack[]> {
        let modified_query = query;

        const query_url = parseUrlFromString(modified_query);
        if (
            query_url && (
                query_url.hostname === 'www.youtube.com' ||
                query_url.hostname === 'youtube.com' ||
                query_url.hostname === 'youtu.be'
            )
        ) {
            // we can assume that the query is a youtube url

            const video_id_from_query_param = query_url.searchParams.get('v');
            const playlist_id_from_query_param = query_url.searchParams.get('list');

            const new_query_params = new URLSearchParams({
                ...(video_id_from_query_param ? {
                    'v': video_id_from_query_param,
                } : {}),
                ...(playlist_id_from_query_param ? {
                    'list': playlist_id_from_query_param,
                } : {}),
            });

            modified_query = `${query_url.protocol}//${query_url.hostname}${query_url.pathname}?${new_query_params}`;

            console.warn('MusicReconnaissance.searchWithYouTube():', {
                query,
                modified_query,
            });
        }

        const resources: ResourceInfo[] = [];

        if (YoutubeSearch.isPlaylist(modified_query)) {
            const playlist = await YoutubeSearch.getPlaylist(modified_query, {
                requestOptions: youtube_request_options,
            }).catch((error) => {
                console.trace('MusicReconnaissance.searchWithYouTube():', error);

                return undefined;
            });

            if (!playlist?.videos) return [];

            for (const video of playlist.videos) {
                // video is actually nullable, even though it's not documented as such
                if (!video) continue;

                resources.push({
                    title: video.title || 'Unknown',
                    url: video.url,
                });
            }
        } else {
            let resource_info: ResourceInfo | undefined;

            if (
                ytdl.validateID(modified_query) ||
                ytdl.validateURL(modified_query)
            ) {
                resource_info = await ytdl.getInfo(modified_query, {
                    requestOptions: youtube_request_options,
                }).then(
                    (video_info) => ({
                        title: video_info.videoDetails.title,
                        url: video_info.videoDetails.video_url,
                    })
                ).catch((error) => {
                    console.warn('ytdl.getInfo():', error);

                    return undefined;
                });
            } else {
                resource_info = await YoutubeSearch.searchOne(modified_query, 'video', undefined, youtube_request_options).then(
                    (video_info) => {
                        // video_info is actually nullable, even though it's not documented as such
                        if (!video_info) throw new Error(`No results found for: ${modified_query};`);

                        return {
                            title: video_info.title || 'Unknown',
                            url: video_info.url,
                        };
                    }
                ).catch((error) => {
                    console.warn('YouTubeSearch.searchOne():', error);

                    return undefined;
                });
            }

            if (resource_info) resources.push(resource_info);
        }

        return resources.map(
            (resource) => new TrackSpace.YouTubeTrack({
                metadata: {
                    title: resource.title,
                    url: resource.url,
                },
                stream_creator: () => StreamerSpace.youtubeStream(resource.url),
            })
        );
    }

    private static async searchWithSoundCloud(
        query: string,
    ): Promise<TrackSpace.SoundCloudTrack[]> {
        const sc_search_results = await sc_client.search(query, 'track');
        if (sc_search_results.length < 1) return [];

        const filtered_tracks = [];

        for (const sc_search_result of sc_search_results) {
            const sc_song_info = await sc_client.getSongInfo(sc_search_result.url);
            if (!sc_song_info) continue;

            // ensure that the track is longer than 60 seconds
            // it is more likely to be a song than not a song
            if (sc_song_info.duration < 60_000) continue;

            filtered_tracks.push(
                new TrackSpace.SoundCloudTrack({
                    metadata: {
                        title: sc_song_info.title,
                        url: sc_song_info.url,
                    },
                    stream_creator: () => sc_song_info.downloadHLS(),
                })
            );

            break; // only allow one track to be added
        }

        return filtered_tracks;
    }

    static async search(
        query: string,
        method: 'youtube' | 'soundcloud' | undefined = undefined,
    ): Promise<TrackSpace.RemoteTrack[]> {
        const trimmed_query = `${query}`.trim();

        const search_trigger_regex = new RegExp(`^(${Object.values(SearchTrigger).join('|')}):`, 'i');

        const matched_trigger = trimmed_query.match(search_trigger_regex)?.at(0)?.replace(':', '')?.toLowerCase();
        const matched_query = matched_trigger ? trimmed_query.slice(matched_trigger.length).trim() : trimmed_query;

        const query_trigger = method ?? matched_trigger ?? 'youtube';
        switch (query_trigger) {
            case SearchTrigger.SoundCloudShortened:
            case SearchTrigger.SoundCloud: {
                console.warn('MusicReconnaissance.search(): SoundCloud trigger activated:', {
                    query,
                    matched_query,
                    query_trigger,
                });

                return MusicReconnaissance.searchWithSoundCloud(matched_query);
            }

            case SearchTrigger.YoutubeShortened:
            case SearchTrigger.Youtube:
            default: {
                console.warn('MusicReconnaissance.search(): YouTube trigger activated:', {
                    query,
                    matched_query,
                    query_trigger,
                });

                return MusicReconnaissance.searchWithYouTube(matched_query);
            }
        }
    }
}

//------------------------------------------------------------//

const music_subscriptions = new Map<GuildId, MusicSubscription>();

//------------------------------------------------------------//

export {
    QueueSpace,

    TrackSpace,

    StreamerSpace,

    music_subscriptions,
};
