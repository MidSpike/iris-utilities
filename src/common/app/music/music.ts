
'use strict';
//------------------------------------------------------------//

import { promisify } from 'node:util';

import {
    Player as DiscordPlayer,
    QueryType as DiscordPlayerQueryType,
    Track as DiscordPlayerTrack,
} from 'discord-player';

import {
    createAudioPlayer,
    entersState,
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} from '@discordjs/voice';

import { Client as DiscordClient } from 'discord.js';

const delay = promisify(setTimeout);

//------------------------------------------------------------//

type GuildId = string;

//------------------------------------------------------------//

const music_subscriptions: Map<GuildId, MusicSubscription> = new Map();

//------------------------------------------------------------//

type BaseTrackMetadata = {
    [key: string]: any;
    title: string;
    url?: string;
}

type ResourceCreator<T> = (track: T) => Promise<AudioResource>;


/**
 * {{
 *  [key: string]: any,
 *  title: string,
 *  url?: string,
 *  tts_text?: string,
 *  tts_lang?: string,
 * }} BaseTrackMetadata
 */

//------------------------------------------------------------//

class BaseTrack {
    #resource: AudioResource | undefined;

    #metadata: BaseTrackMetadata;

    #resource_creator: ResourceCreator<this>;

    #events: {
        onStart: () => void;
        onFinish: () => void;
        onError: (error: unknown) => void;
    };

    constructor(
        metadata: BaseTrackMetadata,
        resource_creator: ResourceCreator<BaseTrack>,
        { onStart, onFinish, onError }: {
            onStart: () => void;
            onFinish: () => void;
            onError: (error: unknown) => void;
        }
    ) {
        this.#metadata = metadata;
        this.#resource_creator = resource_creator;
        this.#events = { onStart, onFinish, onError };
    }

    get resource() {
        return this.#resource as AudioResource;
    }

    get metadata(): BaseTrackMetadata {
        return this.#metadata;
    }

    /**
     * @returns {Promise<AudioResource>}
     */
    async initializeResource() {
        this.#resource = await this.#resource_creator(this);

        this.#resource.volume!.setVolumeLogarithmic(0);

        return this.#resource;
    }

    onStart() {
        this.#events.onStart();
    }

    onFinish() {
        this.#events.onFinish();
    }

    onError(error: unknown) {
        this.#events.onError(error);
    }
}

//------------------------------------------------------------//

class RemoteTrack extends BaseTrack {}

//------------------------------------------------------------//

class QueueVolumeManager {
    #volume_multiplier = 0.40;

    #human_volume_multiplier = 100;

    #muted_previous_raw_volume: number = 0;

    #muted = false;

    #default_volume = 50;

    #default_raw_volume = (this.#default_volume / this.#human_volume_multiplier) * this.#volume_multiplier;

    #raw_volume = this.#default_raw_volume;

    #queue: Queue;

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

class Queue {
    locked: boolean = false;

    #looping_mode: 'off' | 'track' | 'queue' | 'autoplay' = 'off';

    #previous_tracks: BaseTrack[] = [];

    #current_track: BaseTrack | undefined = undefined;

    #future_tracks: BaseTrack[] = [];

    readonly volume_manager: QueueVolumeManager = new QueueVolumeManager(this);

    // eslint-disable-next-line no-useless-constructor, no-empty-function
    constructor() {}

    get previous_tracks() {
        return this.#previous_tracks;
    }

    get current_track() {
        return this.#current_track;
    }

    get future_tracks() {
        return this.#future_tracks;
    }

    get looping_mode() {
        return this.#looping_mode;
    }

    set looping_mode(mode) {
        if (!['off', 'track', 'queue', 'autoplay'].includes(mode)) {
            throw new TypeError(`Invalid looping mode: ${mode}`);
        }

        this.#looping_mode = mode;
    }

    getTrack(position: number): BaseTrack | undefined {
        return this.#future_tracks[position];
    }

    /**
     * @param {BaseTrack} track The track to add to the queue
     * @param {number} position The position to add the track at (0-indexed)
     */
    addTrack(
        track: BaseTrack,
        position: number = this.#future_tracks.length,
    ) {
        this.#future_tracks.splice(position, 0, track);
    }

    removeTrack(position: number): BaseTrack | undefined {
        return this.#future_tracks.splice(position, 1).at(0);
    }

    clearPreviousTracks() {
        this.#previous_tracks.splice(0, this.#previous_tracks.length);
    }

    clearFutureTracks() {
        this.#future_tracks.splice(0, this.#future_tracks.length);
    }

    clearAllTracks() {
        this.#future_tracks.splice(0, this.#future_tracks.length);
        this.#current_track = undefined;
        this.#previous_tracks.splice(0, this.#previous_tracks.length);
    }

    shuffleTracks() {
        this.#future_tracks.sort(() => Math.random() - 0.5); // weighted, but works well enough
    }

    /**
     * @returns {Promise<BaseTrack|void>} The next track in the queue if possible
     */
    async processNextTrack() {
        if (this.locked) return;
        this.locked = true;

        const previous_track = this.#current_track;
        if (previous_track) this.#previous_tracks.splice(0, 0, previous_track);

        /** @type {BaseTrack} */
        let next_track;
        switch (this.#looping_mode) {
            case 'off': {
                next_track = this.#future_tracks.shift();
                break;
            }

            case 'track': {
                if (previous_track) next_track = previous_track;
                break;
            }

            case 'queue': {
                if (previous_track) this.#future_tracks.push(previous_track);
                next_track = this.#future_tracks.shift();
                break;
            }

            case 'autoplay': {
                /** @todo */
                throw new Error('Autoplay mode not implemented!');
            }

            default: {
                throw new Error(`Unknown looping mode: ${this.#looping_mode}`);
            }
        }

        if (!next_track) {
            this.locked = false;
            return;
        }

        try {
            await next_track.initializeResource();
        } catch (error) {
            next_track.onError(error);
            this.locked = false;
            return;
        }

        this.#current_track = next_track;

        this.locked = false;

        return next_track;
    }

    resetState() {
        this.clearAllTracks();
        this.#looping_mode = 'off';
    }
}

//------------------------------------------------------------//

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
class MusicSubscription {
    readonly #voice_connection: VoiceConnection;

    readonly #audio_player: AudioPlayer;

    /** @readonly */
    queue = new Queue();

    /** @private */
    #locked = false;

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
                !this.#locked &&
                (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
            ) {
                /**
                 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
                 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
                 * states.
                 */
                this.#locked = true;

                try {
                    await entersState(this.#voice_connection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (this.#voice_connection.state.status !== VoiceConnectionStatus.Destroyed) this.#voice_connection.destroy();
                } finally {
                    this.#locked = false;
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
     * @param {boolean} [force=false] Whether to force the queue to be processed, even if not idling.
     */
    async processQueue(force=false) {
        if (!force && this.#audio_player.state.status !== AudioPlayerStatus.Idle) {
            return;
        }

        const next_track = await this.queue.processNextTrack();
        if (!next_track) {
            return;
        }

        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) {
            console.warn(`Queue locked, playing ${next_track.metadata.title}`);
            return;
        }

        // Play the next track
        this.#audio_player.play(next_track.resource);
    }
}

//------------------------------------------------------------//

/**
 * @typedef {{
 *   title: string,
 *   url: string,
 * }} MusicReconnaissanceSearchResult
 */

type MusicReconnaissanceSearchResult = {
    title: string;
    url: string;
}

class MusicReconnaissance {
    readonly #client: DiscordClient<true>;
    readonly #discord_player: DiscordPlayer;

    constructor(discord_client: DiscordClient<true>) {
        this.#client = discord_client;

        this.#discord_player = new DiscordPlayer(discord_client);
    }

    async search(query: string): Promise<MusicReconnaissanceSearchResult[]> {
        const search_result = await this.#discord_player.search(query, {
            requestedBy: this.#client.user.id,
            searchEngine: DiscordPlayerQueryType.AUTO,
        });

        const tracks = (search_result.playlist?.tracks ?? [ search_result.tracks.at(0) ]).filter(track => track instanceof DiscordPlayerTrack) as DiscordPlayerTrack[];

        return tracks.map(track => ({
            title: track.title,
            url: track.url,
        }));
    }
}

//------------------------------------------------------------//

module.exports = {
    BaseTrack,
    RemoteTrack,
    MusicSubscription,
    music_subscriptions,
    MusicReconnaissance,
};