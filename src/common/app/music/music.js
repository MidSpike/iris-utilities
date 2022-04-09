
'use strict';
//------------------------------------------------------------//

const { promisify } = require('node:util');

const {
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

    constructor({ url, title, onStart, onFinish, onError }) {
        this.url = url;
        this.title = title;
        this.onStart = onStart;
        this.onFinish = onFinish;
        this.onError = onError;
    }

    /**
     * Creates an AudioResource from this Track.
     */
    createAudioResource() {
        return new Promise((resolve, reject) => {
            const process = ytdl(
                this.url,
                {
                    o: '-',
                    q: '',
                    f: 'bestaudio[ext=webm+acodec=opus+asr=48000]/bestaudio',
                    r: '100K',
                },
                {
                    stdio: [ 'ignore', 'pipe', 'ignore' ],
                },
            );
            if (!process.stdout) {
                reject(new Error('No stdout'));
                return;
            }
            const stream = process.stdout;
            const onError = (error) => {
                if (!process.killed) process.kill();
                stream.resume();
                reject(error);
            };
            process.once('spawn', () => {
                demuxProbe(stream).then((probe) => {
                    const audio_resource = createAudioResource(probe.stream, {
                        metadata: this,
                        inputType: probe.type,
                        inlineVolume: true,
                    });

                    // IMPORTANT: set a sensible default volume
                    audio_resource.volume.setVolumeLogarithmic(0.25);

                    resolve(audio_resource);
                }).catch(onError);
            }).catch(onError);
        });
    }

    /**
     * Creates a Track from a video URL and lifecycle callback methods.
     *
     * @param url The URL of the video
     * @param methods Lifecycle callbacks
     *
     * @returns The created Track
     */
    static async from(url, methods) {
        const info = await getInfo(url);

        // The methods are wrapped so that we can ensure that they are only called once.
        const wrappedMethods = {
            onStart() {
                wrappedMethods.onStart = () => {};
                methods.onStart();
            },
            onFinish() {
                wrappedMethods.onFinish = () => {};
                methods.onFinish();
            },
            onError(error) {
                wrappedMethods.onError = () => {};
                methods.onError(error);
            },
        };

        return new Track({
            title: info.videoDetails.title,
            url: info.videoDetails.video_url,
            ...wrappedMethods,
        });
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
    /** @type {Track[]} */
    queue;
    active_audio_resource = null;
    queueLock = false;
    readyLock = false;

    constructor(voiceConnection) {
        this.voiceConnection = voiceConnection;
        this.audioPlayer = createAudioPlayer();
        this.queue = [];

        this.voiceConnection.on(
            'stateChange',
            async (oldState, newState) => {
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
                     * Once destroyed, stop the subscription.
                     */
                    this.stop();
                } else if (
                    !this.readyLock &&
                    (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)
                ) {
                    /**
                     * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
                     * before destroying the voice connection. This stops the voice connection permanently existing in one of these
                     * states.
                     */
                    this.readyLock = true;
                    try {
                        await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
                    } catch {
                        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
                    } finally {
                        this.readyLock = false;
                    }
                }
            },
        );

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
     * Adds a new Track to the queue.
     *
     * @param track The track to add to the queue
     */
    addTrack(track, index=undefined) {
        this.queue.splice(index ?? this.queue.length, 0, track);
        this.processQueue();
    }

    /**
     * Stops audio playback and empties the queue.
     */
    stop() {
        this.queueLock = true;
        this.queue = [];
        this.audioPlayer.stop(true);
    }

    /**
     * Attempts to play a Track from the queue.
     */
    async processQueue(){
        // If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
        if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
            return;
        }
        // Lock the queue to guarantee safe access
        this.queueLock = true;

        // Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
        const nextTrack = this.queue.shift();
        try {
            // Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
            const resource = await nextTrack.createAudioResource();
            this.active_audio_resource = resource;
            this.audioPlayer.play(resource);
            this.queueLock = false;
        } catch (error) {
            // If an error occurred, try the next item of the queue instead
            nextTrack.onError(error);
            this.queueLock = false;
            return this.processQueue();
        }
    }
}

//------------------------------------------------------------//

module.exports = {
    Track,
    MusicSubscription,
    music_subscriptions,
};