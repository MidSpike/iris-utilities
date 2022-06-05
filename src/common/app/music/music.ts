
'use strict';
//------------------------------------------------------------//

import { promisify } from 'node:util';

import {
    Player as DiscordPlayer,
    QueryType as DiscordPlayerQueryType,
    Track as DiscordPlayerTrack,
} from 'discord-player';

import {
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    createAudioPlayer,
    entersState,
} from '@discordjs/voice';

import { Client as DiscordClient } from 'discord.js';

//------------------------------------------------------------//

const delay = promisify(setTimeout);

//------------------------------------------------------------//

type GuildId = string;

//------------------------------------------------------------//

export interface BaseTrackMetadata {
    [key: string]: unknown;
    title: string;
}

export type BaseResourceCreator = () => Promise<AudioResource>;

export class BaseTrack<
    MetaData extends BaseTrackMetadata = BaseTrackMetadata,
    ResourceCreator extends BaseResourceCreator = BaseResourceCreator,
> {
    private _metadata: MetaData;

    private _resource: AudioResource | undefined;

    private _resource_creator: ResourceCreator;

    private _events: {
        onStart: () => void;
        onFinish: () => void;
        onError: (error: unknown) => void;
    };

    constructor(
        metadata: MetaData,
        resource_creator: ResourceCreator,
        { onStart, onFinish, onError }: {
            onStart: () => void;
            onFinish: () => void;
            onError: (error: unknown) => void;
        }
    ) {
        this._metadata = metadata;
        this._resource_creator = resource_creator;
        this._events = { onStart, onFinish, onError };
    }

    get metadata(): MetaData {
        return this._metadata;
    }

    get resource(): AudioResource | undefined {
        return this._resource;
    }

    async initializeResource(): Promise<AudioResource> {
        await this.destroyResource(); // destroy any existing resource (useful for when the track is being re-used)

        this._resource = await this._resource_creator();

        this._resource.volume!.setVolumeLogarithmic(0);

        return this._resource;
    }

    async fetchResource(): Promise<AudioResource> {
        if (this._resource) {
            return this._resource;
        }

        return await this.initializeResource();
    }

    async destroyResource(): Promise<void> {
        this._resource = undefined;
    }

    async onStart() {
        this._events.onStart();
    }

    async onFinish() {
        await this.destroyResource();

        this._events.onFinish();
    }

    async onError(error: unknown) {
        await this.destroyResource();

        this._events.onError(error);
    }
}

//------------------------------------------------------------//

export interface RemoteTrackMetadata extends BaseTrackMetadata {
    url: string;
}

export class RemoteTrack extends BaseTrack<RemoteTrackMetadata> {}

//------------------------------------------------------------//

export interface TextToSpeechTrackMetadata extends BaseTrackMetadata {
    tts_text: string,
    tts_provider: string,
    tts_voice: string,
}

export class TextToSpeechTrack extends BaseTrack<TextToSpeechTrackMetadata> {}

//------------------------------------------------------------//

export class QueueVolumeManager {
    #volume_multiplier = 0.40;

    #human_volume_multiplier = 100;

    #muted_previous_raw_volume: number = 0;

    #muted = false;

    #default_volume = 50;

    #default_raw_volume = (this.#default_volume / this.#human_volume_multiplier) * this.#volume_multiplier;

    #raw_volume = this.#default_raw_volume;

    // eslint-disable-next-line no-use-before-define
    #queue: Queue;

    // eslint-disable-next-line no-use-before-define
    constructor(queue: Queue) {
        // eslint-disable-next-line no-use-before-define
        if (!(queue instanceof Queue)) throw new TypeError('queue must be an instance of Queue');

        this.#queue = queue;
    }

    #getActiveResource(): AudioResource | undefined {
        return this.#queue.current_track?.resource;
    }

    get volume() {
        const active_resource_volume = this.#getActiveResource()?.volume?.volumeLogarithmic;
        const raw_logarithmic_volume = this.#raw_volume ?? active_resource_volume ?? this.#default_raw_volume;

        return Math.round(raw_logarithmic_volume / this.#volume_multiplier * this.#human_volume_multiplier);
    }

    set volume(human_volume) {
        this.#raw_volume = (human_volume / this.#human_volume_multiplier) * this.#volume_multiplier;

        const active_resource = this.#getActiveResource();
        if (!active_resource) return;

        active_resource.volume?.setVolumeLogarithmic(this.#raw_volume);
    }

    get muted() {
        return this.#muted;
    }

    toggleMute() {
        const active_resource = this.#getActiveResource();
        if (!active_resource) return;

        if (this.#muted) {
            active_resource.volume!.setVolumeLogarithmic(this.#muted_previous_raw_volume);
        } else {
            this.#muted_previous_raw_volume = active_resource.volume!.volumeLogarithmic;
            active_resource.volume!.setVolumeLogarithmic(0);
        }

        this.#muted = !this.#muted;
    }

    /**
     * Initializes the volume manager.
     * Intended purpose is to set a sensible default volume.
     */
    initialize() {
        const active_resource = this.#getActiveResource();
        if (!active_resource) return;

        active_resource.volume?.setVolumeLogarithmic(this.#raw_volume ?? this.#default_raw_volume);
    }
}

//------------------------------------------------------------//

/** @todo export type QueueLoopingMode = 'off' | 'track' | 'queue' | 'autoplay'; */
export type QueueLoopingMode = 'off' | 'track' | 'queue';

export class Queue<Track extends BaseTrack = BaseTrack> {
    private _looping_mode: QueueLoopingMode = 'off';

    private _previous_tracks: Track[] = [];

    private _current_track: Track | undefined = undefined;

    private _future_tracks: Track[] = [];

    public readonly volume_manager: QueueVolumeManager = new QueueVolumeManager(this);

    public locked: boolean = false;

    constructor() {}

    get previous_tracks() {
        return this._previous_tracks;
    }

    get current_track() {
        return this._current_track;
    }

    get future_tracks() {
        return this._future_tracks;
    }

    get looping_mode(): QueueLoopingMode {
        return this._looping_mode;
    }

    set looping_mode(mode: QueueLoopingMode) {
        this._looping_mode = mode;
    }

    /**
     * @param position The position of the track in the queue (0-indexed)
     */
    getTrack(position: number): Track | undefined {
        return this._future_tracks[position];
    }

    /**
     * @param track The track to add to the queue
     * @param position The position to add the track at (0-indexed)
     */
    addTrack(
        track: Track,
        position: number = this._future_tracks.length,
    ) {
        this._future_tracks.splice(position, 0, track);
    }

    /**
     * @param position The position of the track to remove from the queue (0-indexed)
     */
    removeTrack(position: number): Track | undefined {
        return this._future_tracks.splice(position, 1).at(0);
    }

    clearPreviousTracks() {
        this._previous_tracks.splice(0, this._previous_tracks.length);
    }

    clearFutureTracks() {
        this._future_tracks.splice(0, this._future_tracks.length);
    }

    clearAllTracks() {
        this._future_tracks.splice(0, this._future_tracks.length);
        this._current_track = undefined;
        this._previous_tracks.splice(0, this._previous_tracks.length);
    }

    shuffleTracks() {
        this._future_tracks.sort(() => Math.random() - 0.5); // weighted, but works well enough
    }

    async processNextTrack(): Promise<Track | void> {
        if (this.locked) return;
        this.locked = true;

        const previous_track = this._current_track;
        if (previous_track) this._previous_tracks.splice(0, 0, previous_track);

        let next_track: Track | undefined;
        switch (this._looping_mode) {
            case 'off': {
                next_track = this._future_tracks.shift();
                break;
            }

            case 'track': {
                if (previous_track) next_track = previous_track;

                break;
            }

            case 'queue': {
                if (previous_track) this._future_tracks.push(previous_track);
                next_track = this._future_tracks.shift();

                break;
            }

            /** @todo */
            // case 'autoplay': {
            //     throw new Error('Autoplay mode not implemented!');
            // }

            default: {
                throw new Error(`Unknown looping mode: ${this._looping_mode}`);
            }
        }

        if (!next_track) {
            this._current_track = undefined;

            this.locked = false;

            return;
        }

        this._current_track = next_track;

        this.locked = false;

        return next_track;
    }

    resetState() {
        this.clearAllTracks();
        this._looping_mode = 'off';
    }
}

//------------------------------------------------------------//

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
export class MusicSubscription {
    readonly #voice_connection: VoiceConnection;

    readonly #audio_player: AudioPlayer;

    readonly queue = new Queue();

    private _locked = false;

    constructor(voice_connection: VoiceConnection) {
        this.#audio_player = createAudioPlayer();

        this.#voice_connection = voice_connection;
        this.#voice_connection.on<'error'>('error', console.warn);

        this.#voice_connection.on<'stateChange'>('stateChange', async (oldState, newState) => {
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
                        await entersState(this.#voice_connection, VoiceConnectionStatus.Connecting, 5_000);
                        // Probably moved voice channel
                    } catch {
                        this.#voice_connection.destroy();
                        // Probably removed from voice channel
                    }
                } else if (this.#voice_connection.rejoinAttempts < 5) {
                    /**
                     * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
                     */
                    await delay((this.#voice_connection.rejoinAttempts + 1) * 5_000);
                    this.#voice_connection.rejoin();
                } else {
                    /**
                     * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
                     */
                    this.#voice_connection.destroy();
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
                    await entersState(this.#voice_connection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (this.#voice_connection.state.status !== VoiceConnectionStatus.Destroyed) this.#voice_connection.destroy();
                } finally {
                    this._locked = false;
                }
            }
        });

        // Configure audio player
        this.#audio_player.on<'stateChange'>('stateChange', async (oldState, newState) => {
            // await delay(50); // wait a bit to prevent funny business

            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                // track.onEnd() is called to notify the track that it has finished playing.
                (oldState.resource.metadata as BaseTrack).onFinish();
                this.processQueue(false);
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                // track.onStart() is called to notify the track that playback has started.
                (newState.resource.metadata as BaseTrack).onStart();
            }
        });

        this.#audio_player.on('error', (error) => (error.resource.metadata as BaseTrack).onError(error));

        this.#voice_connection.subscribe(this.#audio_player);
    }

    get voice_connection() {
        return this.#voice_connection;
    }

    /**
     * Kills the subscription, clears the queue, stops the audio player.
     */
    async kill() {
        this.queue.resetState();
        this.#audio_player.stop(true);
        this.#voice_connection.disconnect();
    }

    /**
     * Attempts to play a track from the queue.
     * @param force Whether to force the queue to be processed, even if not idling.
     */
    async processQueue(
        force: boolean = false,
    ) {
        if (!force && this.#audio_player.state.status !== AudioPlayerStatus.Idle) return;

        // Pause the audio player if we are forcing the queue to be processed
        if (force) this.#audio_player.pause(true);

        const next_track = await this.queue.processNextTrack();
        if (!next_track) return;

        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) return;

        const next_track_resource = await next_track.initializeResource();

        // Play the next track
        this.#audio_player.play(next_track_resource);
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

        const search_result = await MusicReconnaissance._discord_player.search(query, {
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

export const music_subscriptions: Map<GuildId, MusicSubscription> = new Map();
