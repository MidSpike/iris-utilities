//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import {
    AudioResource,
} from '@discordjs/voice';

import { Track } from './track';

//------------------------------------------------------------//

export class QueueVolumeManager {
    private _volume_multiplier = 0.40;

    private _human_volume_multiplier = 100;

    private _muted_previous_raw_volume: number = 0;

    private _muted = false;

    private _default_volume = 50;

    private _default_raw_volume = (this._default_volume / this._human_volume_multiplier) * this._volume_multiplier;

    private _raw_volume = this._default_raw_volume;

    // eslint-disable-next-line no-use-before-define
    private _queue: Queue;

    // eslint-disable-next-line no-use-before-define
    constructor(queue: Queue) {
        // eslint-disable-next-line no-use-before-define
        if (!(queue instanceof Queue)) throw new TypeError('queue must be an instance of Queue');

        this._queue = queue;
    }

    private _getActiveResource(): AudioResource | undefined {
        return this._queue.current_track?.resource;
    }

    get volume() {
        const active_resource_volume = this._getActiveResource()?.volume?.volumeLogarithmic;
        const raw_logarithmic_volume = this._raw_volume ?? active_resource_volume ?? this._default_raw_volume;

        return Math.round(raw_logarithmic_volume / this._volume_multiplier * this._human_volume_multiplier);
    }

    set volume(human_volume) {
        this._raw_volume = (human_volume / this._human_volume_multiplier) * this._volume_multiplier;

        const active_resource = this._getActiveResource();
        if (!active_resource) return;

        active_resource.volume?.setVolumeLogarithmic(this._raw_volume);
    }

    get muted() {
        return this._muted;
    }

    toggleMute() {
        const active_resource = this._getActiveResource();
        if (!active_resource) return;

        if (this._muted) {
            active_resource.volume!.setVolumeLogarithmic(this._muted_previous_raw_volume);
        } else {
            this._muted_previous_raw_volume = active_resource.volume!.volumeLogarithmic;
            active_resource.volume!.setVolumeLogarithmic(0);
        }

        this._muted = !this._muted;
    }

    /**
     * Initializes the volume manager.
     * Intended purpose is to set a sensible default volume.
     */
    initialize() {
        const active_resource = this._getActiveResource();
        if (!active_resource) return;

        active_resource.volume?.setVolumeLogarithmic(this._raw_volume ?? this._default_raw_volume);
    }
}

//------------------------------------------------------------//

/** @todo export type QueueLoopingMode = 'off' | 'track' | 'queue' | 'autoplay'; */
export type QueueLoopingMode = 'off' | 'track' | 'queue';

export class Queue {
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
