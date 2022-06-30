//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GuildId } from '@root/types/index';

import { promisify } from 'node:util';

import {
    Player as DiscordPlayer,
    QueryType as DiscordPlayerQueryType,
    Track as DiscordPlayerTrack,
} from 'discord-player';

import {
    AudioPlayer,
    AudioPlayerStatus,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    createAudioPlayer,
    entersState,
} from '@discordjs/voice';

import { Client as DiscordClient } from 'discord.js';

import { Queue, QueueLoopingMode } from './queue/queue';

import { RemoteTrack, TextToSpeechTrack, Track } from './queue/track';

import * as Streamer from './streamer/streamer';

import { parseUrlFromString } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const delay = promisify(setTimeout);

//------------------------------------------------------------//

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
export class MusicSubscription {
    private readonly _voice_connection: VoiceConnection;

    private readonly _audio_player: AudioPlayer;

    readonly queue = new Queue();

    private _locked = false;

    constructor(voice_connection: VoiceConnection) {
        this._audio_player = createAudioPlayer();

        this._voice_connection = voice_connection;
        this._voice_connection.on<'error'>('error', console.warn);

        this._voice_connection.on<'stateChange'>('stateChange', async (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                    /**
                     * If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
                     * but there is a chance the connection will recover itself if the reason of the disconnect was due to
                     * switching voice channels. This is also the same code for the bot being kicked from the voice channel,
                     * so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
                     * the voice connection.
                     */
                    try {
                        await entersState(this._voice_connection, VoiceConnectionStatus.Connecting, 5_000);
                        // Probably moved voice channel
                    } catch {
                        this._voice_connection.destroy();
                        // Probably removed from voice channel
                    }
                } else if (this._voice_connection.rejoinAttempts < 5) {
                    /**
                     * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
                     */
                    await delay((this._voice_connection.rejoinAttempts + 1) * 5_000);
                    this._voice_connection.rejoin();
                } else {
                    /**
                     * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
                     */
                    this._voice_connection.destroy();
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                /**
                 * Once destroyed, kill the subscription.
                 */
                await this.kill();
            } else if (
                !this._locked &&
                (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
            ) {
                /**
                 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
                 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
                 * states.
                 */
                this._locked = true;

                try {
                    await entersState(this._voice_connection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (this._voice_connection.state.status !== VoiceConnectionStatus.Destroyed) this._voice_connection.destroy();
                } finally {
                    this._locked = false;
                }
            }
        });

        // Configure audio player
        this._audio_player.on<'stateChange'>('stateChange', async (oldState, newState) => {
            // await delay(50); // wait a bit to prevent funny business

            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                (oldState.resource.metadata as Track).onFinish(); // notify the track that it has finished playing
                this.processQueue(false); // advance the queue to the next track
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                (newState.resource.metadata as Track).onStart(); // notify the track that it has started playing
                this.queue.volume_manager.initialize(); // initialize the volume manager for each track
            }
        });

        this._audio_player.on('error', (error) => (error.resource.metadata as Track).onError(error));

        this._voice_connection.subscribe(this._audio_player);
    }

    get voice_connection() {
        return this._voice_connection;
    }

    /**
     * Kills the subscription, clears the queue, stops the audio player.
     */
    async kill() {
        this.queue.resetState();
        this._audio_player.stop(true);
        this._voice_connection.disconnect();
    }

    /**
     * Attempts to play a track from the queue.
     * @param force Whether to force the queue to be processed, even if not idling.
     */
    async processQueue(
        force: boolean = false,
    ) {
        if (!force && this._audio_player.state.status !== AudioPlayerStatus.Idle) return;

        // Pause the audio player if we are forcing the queue to be processed
        if (force) this._audio_player.pause(true);

        const next_track = await this.queue.processNextTrack();
        if (!next_track) return;

        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) return;

        const next_track_resource = await next_track.initializeResource();
        if (!next_track_resource) return;

        // Play the next track
        this._audio_player.play(next_track_resource);
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
    private static _discord_player: DiscordPlayer;

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
        MusicReconnaissance._discord_player = new DiscordPlayer(discord_client, {
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
            console.warn({
                modified_query,
            });
        }

        const search_result = await MusicReconnaissance._discord_player.search(modified_query, {
            requestedBy: MusicReconnaissance._client.user.id,
            searchEngine: DiscordPlayerQueryType.AUTO,
        });

        const tracks = (search_result.playlist?.tracks ?? [ search_result.tracks.at(0) ]).filter(
            track => track instanceof DiscordPlayerTrack
        ) as DiscordPlayerTrack[];

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
    Queue,
    QueueLoopingMode,

    Track,
    RemoteTrack,
    TextToSpeechTrack,

    Streamer,

    music_subscriptions,
};
