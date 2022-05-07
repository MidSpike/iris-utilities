
'use strict';
//------------------------------------------------------------//

const { promisify } = require('node:util');

const {
    createAudioPlayer,
    createAudioResource,
    demuxProbe,
    entersState,
    AudioPlayer,
    AudioPlayerStatus,
    AudioResource,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} = require('@discordjs/voice');

//------------------------------------------------------------//

const delay = promisify(setTimeout);

//------------------------------------------------------------//

/** @type {Map<GuildId, MusicSubscription>} */
const music_subscriptions = new Map();

//------------------------------------------------------------//

/**
 * @typedef {{
 *  [key: string]: any,
 *  title: string,
 *  url?: string,
 *  tts_text?: string,
 *  tts_lang?: string,
 * }} BaseTrackMetadata
 */

//------------------------------------------------------------//

class BaseTrack {
    /** @type {AudioResource} */
    #resource;

    /** @type {BaseTrackMetadata} */
    #metadata;

    /** @type {Promise<AudioResource>} */
    #resource_creator;

    /**
     * @type {{
     *  onStart: () => void,
     *  onFinish: () => void,
     *  onError: () => void,
     * }}
     */
    #events;

    /**
     * @param {BaseTrackMetadata} metadata
     * @param {Promise<AudioResource>} resource_creator
     * @param {{
     *  onStart: () => void,
     *  onFinish: () => void,
     *  onError: () => void,
     * }} events
     */
    constructor(metadata, resource_creator, { onStart, onFinish, onError }) {
        this.#metadata = metadata;
        this.#resource_creator = resource_creator;
        this.#events = { onStart, onFinish, onError };
    }

    /**
     * @returns {AudioResource}
     */
    get resource() {
        return this.#resource;
    }

    /**
     * @returns {BaseTrackMetadata}
     */
    get metadata() {
        return this.#metadata;
    }

    /**
     * @returns {Promise<AudioResource>}
     */
    async initializeResource() {
        this.#resource = await this.#resource_creator(this);

        this.#resource.volume.setVolumeLogarithmic(0);

        return this.#resource;
    }

    onStart() {
        this.#events.onStart();
    }

    onFinish() {
        this.#events.onFinish();
    }

    onError() {
        this.#events.onError();
    }
}

//------------------------------------------------------------//

class RemoteTrack extends BaseTrack {
    constructor(metadata, resource_creator, { onStart, onFinish, onError }) {
        super(...arguments);
    }
}

//------------------------------------------------------------//

class QueueVolumeManager {
    #queue;

    #volume_multiplier = 0.40;
    #human_volume_multiplier = 100;

    #muted_previous_raw_volume;
    #muted = false;

    #default_volume = 50;
    #default_raw_volume = (this.#default_volume / this.#human_volume_multiplier) * this.#volume_multiplier;

    #raw_volume;

    /**
     * @param {Queue} queue
     */
    constructor(queue) {
        if (!(queue instanceof Queue)) throw new TypeError('queue must be an instance of Queue');

        this.#queue = queue;
    }

    /**
     * @returns {AudioResource?} The current track resource
     */
    #getActiveResource() {
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
            active_resource.volume.setVolumeLogarithmic(this.#muted_previous_raw_volume);
        } else {
            this.#muted_previous_raw_volume = active_resource.volume.volumeLogarithmic;
            active_resource.volume.setVolumeLogarithmic(0);
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
    /** @type {boolean} */
    locked = false;

    /** @type {'off'|'track'|'queue'|'autoplay'} */
    #looping_mode = 'off';

    /** @type {BaseTrack[]} */
    #previous_tracks = [];

    /** @type {BaseTrack?} */
    #current_track = undefined;

    /** @type {BaseTrack[]} */
    #future_tracks = [];

    /** @type {QueueVolumeManager} @readonly */
    volume_manager = new QueueVolumeManager(this);

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

    /**
     * @param {number} position The position of the track to get (0-indexed)
     * @returns {BaseTrack?} The track at the given position
     */
    getTrack(position) {
        return this.#future_tracks[position];
    }

    /**
     * @param {BaseTrack} track The track to add to the queue
     * @param {number} position The position to add the track at (0-indexed)
     */
    addTrack(track, position=this.#future_tracks.length) {
        this.#future_tracks.splice(position, 0, track);
    }

    /**
     * @param {number} position The position of the track to remove (0-indexed)
     * @returns {BaseTrack?} The removed track
     */
    removeTrack(position) {
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
                break;
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
    /** @type {VoiceConnection} @readonly */
    voiceConnection;

    /** @type {AudioPlayer} @readonly */
    audioPlayer;

    /** @readonly */
    queue = new Queue();

    /** @private */
    #readyLock = false;

    constructor(voiceConnection) {
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();

        this.voiceConnection.on('stateChange', async (oldState, newState) => {
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
                        await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
                        // Probably moved voice channel
                    } catch {
                        this.voiceConnection.destroy();
                        // Probably removed from voice channel
                    }
                } else if (this.voiceConnection.rejoinAttempts < 5) {
                    /**
                     * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
                     */
                    await delay((this.voiceConnection.rejoinAttempts + 1) * 5_000);
                    this.voiceConnection.rejoin();
                } else {
                    /**
                     * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
                     */
                    this.voiceConnection.destroy();
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                /**
                 * Once destroyed, kill the subscription.
                 */
                await this.kill();
            } else if (
                !this.#readyLock &&
                (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
            ) {
                /**
                 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
                 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
                 * states.
                 */
                this.#readyLock = true;

                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                } catch {
                    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
                } finally {
                    this.#readyLock = false;
                }
            }
        });

        // Configure audio player
        this.audioPlayer.on('stateChange', async (oldState, newState) => {
            // await delay(50); // wait a bit to prevent funny business

            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                oldState.resource.metadata.onFinish();
                this.processQueue(false);
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                // track.onStart() is called to notify the track that playback has started.
                newState.resource.metadata.onStart();
            }
        });

        this.audioPlayer.on('error', (error) => error.resource.metadata.onError(error));

        voiceConnection.subscribe(this.audioPlayer);
    }

    /**
     * Kills the subscription, clears the queue, stops the audio player.
     */
    async kill() {
        this.queue.resetState();
        this.audioPlayer.stop(true);
        this.voiceConnection.disconnect();
    }

    /**
     * Attempts to play a track from the queue.
     * @param {boolean} [force=false] Whether to force the queue to be processed, even if not idling.
     */
    async processQueue(force=false) {
        if (!force && this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
            return;
        }

        const next_track = await this.queue.processNextTrack();
        if (!next_track) {
            return;
        }

        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) {
            console.warn(`Queue locked, playing ${next_track.title}`);
            return;
        }

        // Play the next track
        this.audioPlayer.play(next_track.resource);
    }
}

//------------------------------------------------------------//

module.exports = {
    BaseTrack,
    RemoteTrack,
    MusicSubscription,
    music_subscriptions,
};
