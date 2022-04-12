
'use strict';
//------------------------------------------------------------//

const { promisify } = require('node:util');

const {
    AudioResource,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    demuxProbe,
    entersState,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
} = require('@discordjs/voice');

const { getInfo } = require('ytdl-core');

const { exec: ytdl } = require('youtube-dl-exec');

//------------------------------------------------------------//

const wait = promisify(setTimeout);

//------------------------------------------------------------//

/** @type {Map<GuildId, MusicSubscription>} */
const music_subscriptions = new Map();

//------------------------------------------------------------//

/**
 * A Track represents information about a YouTube video (in this context) that can be added to a queue.
 * It contains the title and URL of the video, as well as functions onStart, onFinish, onError, that act
 * as callbacks that are triggered at certain points during the track's lifecycle.
 *
 * Rather than creating an AudioResource for each video immediately and then keeping those in a queue,
 * we use tracks as they don't preemptively load the videos. Instead, once a Track is taken from the
 * queue, it is converted into an AudioResource just in time for playback.
 */
class Track {
    url;
    title;

    onStart;
    onFinish;
    onError;

    #resource;

    constructor({ url, title, onStart, onFinish, onError }) {
        this.url = url;
        this.title = title;

        this.onStart = onStart ?? (() => {});
        this.onFinish = onFinish ?? (() => {});
        this.onError = onError ?? (() => {});
    }

    /**
     * @type {AudioResource}
     */
    get resource() {
        return this.#resource;
    }

    /**
     * Creates an AudioResource from this Track.
     * @returns {Promise<AudioResource>}
     */
    createAudioResource() {
        return new Promise((resolve, reject) => {
            const process = ytdl(this.url, {
                o: '-',
                q: '',
                f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                r: '100K',
            }, {
                stdio: [ 'ignore', 'pipe', 'ignore' ],
            });

            const stream = process?.stdout;
            if (!stream) {
                reject(new Error('No stdout'));
                return;
            }

            const onError = (error) => {
                if (!process.killed) process.kill();
                stream.resume();
                reject(error);
            };

            process.once('spawn', () => {
                demuxProbe(stream).then((probe) => {
                    this.#resource = createAudioResource(probe.stream, {
                        metadata: this, // the track
                        inputType: probe.type,
                        inlineVolume: true, // allows volume to be adjusted while playing
                    });

                    // IMPORTANT: set a sensible default volume
                    this.#resource.volume.setVolumeLogarithmic(0.125); // 50% in human volume

                    resolve(this.#resource);
                }).catch(onError);
            }).catch(onError);
        });
    }

    /**
     * Creates a Track from a video URL and lifecycle callback methods.
     *
     * @param {string} url The URL of the video
     * @param {object} methods Lifecycle callbacks
     * @param {function} methods.onStart Called when the track starts playing
     * @param {function} methods.onFinish Called when the track finishes playing
     * @param {function} methods.onError Called when the track fails to play
     *
     * @returns {Promise<Track>} The created Track
     */
    static async from(url, { onStart, onFinish, onError }) {
        const info = await getInfo(url);

        return new Track({
            title: info.videoDetails.title,
            url: info.videoDetails.video_url,

            onStart,
            onFinish,
            onError,
        });
    }
}

//------------------------------------------------------------//

class QueueVolumeManager {
    #queue;

    #muted_previous_raw_volume;
    #muted = false;

    #raw_volume;
    #default_raw_volume = 0.25;

    #volume_multiplier = 0.25;
    #human_volume_multiplier = 100;

    /**
     * @param {Queue} queue
     */
    constructor(queue) {
        this.#queue = queue;
    }

    /**
     * @returns {AudioResource?} The current track resource
     */
    #getActiveResource() {
        return this.#queue.current_track?.resource;
    }

    get volume() {
        const active_resource = this.#getActiveResource();

        const active_resource_volume = active_resource?.volume?.volumeLogarithmic;

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
}

//------------------------------------------------------------//

class Queue {
    /** @type {boolean} */
    locked = false;

    /** @type {Track[]} */
    #previous_tracks = [];

    /** @type {Track?} */
    #current_track = null;

    /** @type {Track[]} */
    #future_tracks = [];

    /** @type {QueueVolumeManager} */
    volume_manager = new QueueVolumeManager(this);

    constructor() {}

    /**
     * @type {Track?} The current track
     */
    get current_track() {
        return this.#current_track;
    }

    /**
     * @param {number} position The position of the track to get (0-indexed)
     * @returns {Track?} The track at the given position
     */
    getTrack(position) {
        return this.#future_tracks[position];
    }

    /**
     * @param {Track} track The track to add to the queue
     * @param {number} position The position to add the track at (0-indexed)
     */
    addTrack(track, position=this.#future_tracks.length) {
        this.#future_tracks.splice(position, 0, track);
    }

    /**
     * @param {number} position The position of the track to remove (0-indexed)
     */
    removeTrack(position) {
        this.#future_tracks.splice(position, 1);
    }

    clearTracks() {
        this.#future_tracks.splice(0, this.#future_tracks.length);
    }

    /**
     * @returns {Promise<Track|void>} The next track in the queue if possible
     */
    async processNextTrack() {
        if (this.locked) return;
        this.locked = true;

        if (this.#future_tracks.length === 0) {
            this.locked = false;
            return;
        }

        const previous_track = this.#current_track;
        if (previous_track) {
            this.#previous_tracks.splice(0, 0, previous_track);
        }

        const next_track = this.#future_tracks.shift();
        if (!next_track) {
            this.locked = false;
            return;
        }

        try {
            await next_track.createAudioResource();
        } catch (error) {
            next_track.onError(error);
            this.locked = false;
            return;
        }

        this.#current_track = next_track;

        this.locked = false;

        return next_track;
    }
}

//------------------------------------------------------------//

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
 class MusicSubscription {
    /** @readonly */
    voiceConnection;

    /** @readonly */
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
                    await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
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
                this.kill();
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
        this.audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // If the Idle state is entered from a non-Idle state, it means that an audio resource has finished playing.
                // The queue is then processed to start playing the next track, if one is available.
                oldState.resource.metadata.onFinish();
                this.processQueue();
            } else if (newState.status === AudioPlayerStatus.Playing) {
                // If the Playing state has been entered, then a new track has started playback.
                newState.resource.metadata.onStart();
            }
        });

        this.audioPlayer.on('error', (error) => error.resource.metadata.onError(error));

        voiceConnection.subscribe(this.audioPlayer);
    }

    /**
     * Kills the subscription, clears the queue, stops the audio player.
     */
    kill() {
        this.queue.clearTracks();
        this.audioPlayer.stop(true);
    }

    /**
     * Attempts to play a Track from the queue.
     */
    async processQueue(force=false) {
        if (!force && this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
            return;
        }

        const track = await this.queue.processNextTrack();
        if (!track) {
            return;
        }

        // Check if the queue is locked, and if so, allow the track to automatically be played.
        if (this.queue.locked) {
            console.warn(`Queue locked, playing ${track.title}`);
            return;
        }

        // Play the track
        this.audioPlayer.play(track.resource);
    }
}

//------------------------------------------------------------//

module.exports = {
    Track,
    MusicSubscription,
    music_subscriptions,
};
