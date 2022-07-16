//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Track, YouTubeTrack } from '../track/track';

//------------------------------------------------------------//

export class QueueVolumeManager {
    private _queue: Queue;

    private _volume_multiplier = 0.40;
    private _human_volume_multiplier = 100;
    private _muted_previous_raw_volume: number = 0;
    private _default_volume = 50;
    private _default_raw_volume = (this._default_volume / this._human_volume_multiplier) * this._volume_multiplier;
    private _raw_volume = this._default_raw_volume;

    public muted = false;

    constructor(queue: Queue) {
        this._queue = queue;
    }

    private _getCurrentTrack() {
        return this._queue.current_track;
    }

    get volume() {
        const active_resource_volume = this._getCurrentTrack()?.resource?.volume?.volumeLogarithmic;
        const raw_logarithmic_volume = active_resource_volume ?? this._raw_volume;

        return Math.round(raw_logarithmic_volume / this._volume_multiplier * this._human_volume_multiplier);
    }

    set volume(human_volume) {
        this._raw_volume = (human_volume / this._human_volume_multiplier) * this._volume_multiplier;

        const active_resource = this._getCurrentTrack()?.resource;
        if (!active_resource) return;

        active_resource.volume?.setVolumeLogarithmic(this._raw_volume);
    }

    toggleMute() {
        const active_resource = this._getCurrentTrack()?.resource;
        if (!active_resource) return;

        if (this.muted) {
            active_resource.volume!.setVolumeLogarithmic(this._muted_previous_raw_volume);
        } else {
            this._muted_previous_raw_volume = active_resource.volume!.volumeLogarithmic;
            active_resource.volume!.setVolumeLogarithmic(0);
        }

        this.muted = !this.muted;
    }

    /**
     * Initializes the volume manager.
     * Intended purpose is to set a sensible default volume upon each track change.
     */
    initialize() {
        const active_resource = this._getCurrentTrack()?.resource;
        if (!active_resource) return;

        // don't update the volume directly, as subsequent volume multipliers may be compounded together
        const temp_volume = this._raw_volume * (this._getCurrentTrack()?.volume_multiplier ?? 1.0);

        active_resource.volume?.setVolumeLogarithmic(temp_volume);
    }
}

//------------------------------------------------------------//

export type QueueLoopingMode = 'off' | 'track' | 'queue' | 'autoplay';

export class Queue {
    private _previous_tracks: Track[] = [];
    private _current_track: Track | undefined = undefined;
    private _future_tracks: Track[] = [];

    public locked: boolean = false;
    public looping_mode: QueueLoopingMode = 'off';
    public readonly volume_manager: QueueVolumeManager = new QueueVolumeManager(this);

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

    clearCurrentTrack() {
        this._current_track = undefined;
    }

    clearFutureTracks() {
        this._future_tracks.splice(0, this._future_tracks.length);
    }

    shuffleTracks() {
        this._future_tracks.sort(() => Math.random() - 0.5); // weighted, but works well enough
    }

    async processNextTrack(): Promise<Track | undefined> {
        if (this.locked) return undefined;
        this.locked = true;

        const previous_track = this._current_track;
        if (previous_track) this._previous_tracks.splice(0, 0, previous_track);

        let next_track: Track | undefined;
        switch (this.looping_mode) {
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
                next_track = this._future_tracks.shift()!;

                break;
            }

            case 'autoplay': {
                console.log('processNextTrack(): autoplay mode');

                if (this._future_tracks.length === 0) {
                    let most_recent_yt_track: YouTubeTrack | undefined;

                    for (const previous_track of this._previous_tracks) {
                        if (previous_track instanceof YouTubeTrack) {
                            most_recent_yt_track = previous_track;
                            break;
                        }
                    }

                    if (most_recent_yt_track) {
                        const autoplay_track = await most_recent_yt_track.generateRelatedTrack();

                        if (autoplay_track) {
                            this._future_tracks.push(autoplay_track);
                        }
                    }
                }

                next_track = this._future_tracks.shift();

                break;
            }

            default: {
                throw new Error(`Unknown looping mode: ${this.looping_mode}`);
            }
        }

        if (!next_track) {
            this.reset();

            return undefined;
        }

        this._current_track = next_track;

        this.locked = false;

        return next_track;
    }

    reset() {
        this.locked = true;

        this.clearPreviousTracks();
        this.clearCurrentTrack();
        this.clearFutureTracks();

        this.looping_mode = 'off';

        this.locked = false;
    }
}
