//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GuildId } from '@root/types/index';

import process from 'node:process';

import * as DiscordPlayer from 'discord-player';

import * as DiscordVoice from '@discordjs/voice';

import { Client as DiscordClient } from 'discord.js';

import * as QueueSpace from './queue/queue';

import * as TrackSpace from './track/track';

import * as StreamerSpace from './streamer/streamer';

import { delay, parseUrlFromString } from '@root/common/lib/utilities';

//------------------------------------------------------------//

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
export class MusicSubscription {
    private _locked = false;

    readonly audio_player: DiscordVoice.AudioPlayer;

    readonly voice_connection: DiscordVoice.VoiceConnection;

    readonly queue = new QueueSpace.Queue();

    constructor(
        voice_connection: DiscordVoice.VoiceConnection,
    ) {
        const audio_player = DiscordVoice.createAudioPlayer();

        audio_player.on<'error'>('error', (error) => {
            console.trace(error);

            this.queue.current_track?.onError(error); // notify the track that it has errored

            this.processQueue(true); // advance the queue to the next track
        });

        audio_player.on<'stateChange'>('stateChange', async (oldState, newState) => {
            if (
                oldState.status !== DiscordVoice.AudioPlayerStatus.Idle &&
                newState.status === DiscordVoice.AudioPlayerStatus.Idle
            ) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                this.queue.current_track?.onFinish(); // notify the track that it has finished playing
                this.processQueue(false); // advance the queue to the next track
            } else if (newState.status === DiscordVoice.AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                this.queue.current_track?.onStart(); // notify the track that it has started playing
                this.queue.volume_manager.initialize(); // initialize the volume manager for each track
            }
        });

        voice_connection.on<'error'>('error', (error) => {
            console.trace(error);
        });

        voice_connection.on<'stateChange'>('stateChange', async (oldState, newState) => {
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
                    await this.kill();

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
        this.voice_connection = voice_connection;
    }

    /**
     * Kills the subscription, clears the queue, stops the audio player.
     */
    async kill() {
        this.queue.reset();
        this.audio_player.stop(true);
        this.voice_connection.disconnect(); // only disconnect, don't destroy the voice connection or an infinite loop might occur
    }

    /**
     * Attempts to play a track from the queue.
     * @param force Whether to force the queue to be processed, even if not idling.
     */
    async processQueue(
        force: boolean = false,
    ) {
        // Check if the audio player is idle, and if not, don't process the queue without forcing.
        if (!force && this.audio_player.state.status !== DiscordVoice.AudioPlayerStatus.Idle) return;

        // Pause the audio player if we are forcing the queue to be processed
        if (force) this.audio_player.pause(true);

        // Get the next track from the queue
        const next_track = await this.queue.processNextTrack();
        if (!next_track) return;

        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) return;

        // Get the track's audio resource
        const next_track_resource = await next_track.initializeResource();
        if (!next_track_resource) return;

        // Play the next track
        this.audio_player.play(next_track_resource);
    }
}

//------------------------------------------------------------//

export type MusicReconnaissanceSearchResult = {
    title: string;
    url: string;
}

export class MusicReconnaissance {
    private static _initialized = false;

    private static _client: DiscordClient<true>;
    private static _discord_player: DiscordPlayer.Player;

    static query_types = DiscordPlayer.QueryType;

    /**
     * Initializes the MusicReconnaissance singleton.
     *
     * @notice
     * When initializing the MusicReconnaissance singleton, a proxy of the Discord client is created.
     * This is to trick DiscordPlayer into thinking that it is using a real Discord client.
     * This is necessary because DiscordPlayer uses an outdated (broken) version of the Discord client,
     *
     * @warning
     * This method must be called before any other MusicReconnaissance methods are called.
     *
     * @param discord_client The Discord client to use for the MusicReconnaissance.
     */
    static initialize(
        discord_client: DiscordClient<true>,
    ): void {
        if (MusicReconnaissance._initialized) return;

        const discord_client_proxy = new Proxy(discord_client, {});

        discord_client_proxy.options = new Proxy(discord_client_proxy.options, {
            get(target, key) {
                if (key === 'intents') return undefined;

                // @ts-ignore
                return target[key];
            },
        });

        MusicReconnaissance._client = discord_client;
        MusicReconnaissance._discord_player = new DiscordPlayer.Player(discord_client, {
            ytdlOptions: {
                requestOptions: {
                    headers: {
                        'Accept-Language': 'en-US,en;q=0.5',
                        'User-Agent': process.env.YTDL_USER_AGENT,
                        'Cookie': process.env.YTDL_COOKIE,
                        'x-youtube-identity-token': process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN,
                    },
                },
            },
        });

        MusicReconnaissance._initialized = true;
    }

    static async search(
        query: string,
    ): Promise<MusicReconnaissanceSearchResult[]> {
        if (!MusicReconnaissance._initialized) throw new Error('MusicReconnaissance must be initialized before use.');

        let modified_query = query;

        const query_url = parseUrlFromString(query);
        if (
            query_url && (
                query_url.hostname === 'www.youtube.com' ||
                query_url.hostname === 'youtube.com' ||
                query_url.hostname === 'youtu.be'
            )
        ) {
            const video_id_from_query_param = query_url.searchParams.get('v');

            const new_query_params = video_id_from_query_param ? new URLSearchParams(`v=${video_id_from_query_param}`) : new URLSearchParams();
            modified_query = `${query_url.protocol}//${query_url.hostname}${query_url.pathname}?${new_query_params}`;

            console.warn('MusicReconnaissance.search():', {
                modified_query,
            });
        }

        const search_result = await MusicReconnaissance._discord_player.search(modified_query, {
            requestedBy: MusicReconnaissance._client.user.id,
            searchEngine: DiscordPlayer.QueryType.AUTO,
        });

        const tracks = (search_result.playlist?.tracks ?? [ search_result.tracks.at(0) ]).filter(
            track => track instanceof DiscordPlayer.Track,
        ) as DiscordPlayer.Track[];

        return tracks.map(track => ({
            title: track.title,
            url: track.url,
        }));
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
