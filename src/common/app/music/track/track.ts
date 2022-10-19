//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Readable } from 'node:stream';

import * as DiscordVoice from '@discordjs/voice';

import { extractVideoIdFromYoutubeUrl, youtubeRelatedVideoId } from '../searcher/youtube';

import { MusicReconnaissance } from '../music';

//------------------------------------------------------------//

type TrackEvents = {
    onStart: ((track: Track) => void)[];
    onFinish: ((track: Track) => void)[];
    onError: ((track: Track, error: unknown) => void)[];
};

//------------------------------------------------------------//

export interface TrackMetadata {
    [key: string]: unknown;
    title: string;
}

export class Track<
    Metadata extends TrackMetadata = TrackMetadata,
> {
    private _metadata: Metadata;
    private _stream_creator: () => Promise<Readable | undefined>;
    private _events: TrackEvents = {
        onStart: [],
        onFinish: [],
        onError: [],
    };

    private _resource: DiscordVoice.AudioResource<Track<Metadata>> | undefined = undefined;

    public volume_multiplier = 1.0;

    constructor({
        metadata,
        stream_creator,
    }: {
        metadata: Metadata;
        stream_creator: () => Promise<Readable | undefined>;
    }) {
        this._metadata = metadata;
        this._stream_creator = stream_creator;
    }

    get metadata(): Metadata {
        return this._metadata;
    }

    get resource(): DiscordVoice.AudioResource<Track<Metadata>> | undefined {
        return this._resource;
    }

    async initializeResource(): Promise<DiscordVoice.AudioResource<Track<Metadata>> | undefined> {
        await this.destroyResource(); // destroy any existing resource (useful for when the track is being re-used)

        let stream: Readable | undefined;
        try {
            stream = await this._stream_creator();

            if (!stream) {
                throw new Error('Failed to create stream');
            }

            this._resource = await DiscordVoice.demuxProbe(stream).then(
                (probe) => DiscordVoice.createAudioResource(probe.stream, {
                    inputType: probe.type,
                    inlineVolume: true, // allows volume to be adjusted while playing
                    metadata: this, // this track
                })
            );

            if (!this._resource) throw new Error('Failed to create audio resource');
        } catch (error: unknown) {
            this.triggerOnError(error);

            return undefined;
        }

        this._resource.volume!.setVolumeLogarithmic(0);

        return this._resource;
    }

    async fetchResource(): Promise<DiscordVoice.AudioResource<Track<Metadata>> | undefined> {
        return this._resource ?? await this.initializeResource() ?? undefined;
    }

    async destroyResource(): Promise<void> {
        this._resource = undefined;
    }

    async onStart(cb: (track: Track) => void) {
        this._events.onStart.push(cb);
    }

    async onFinish(cb: (track: Track) => void) {
        this._events.onFinish.push(cb);
    }

    async onError(cb: (track: Track, error: unknown) => void) {
        this._events.onError.push(cb);
    }

    async triggerOnStart() {
        this._events.onStart.forEach((cb) => cb(this));
    }

    async triggerOnFinish() {
        await this.destroyResource();

        this._events.onFinish.forEach((cb) => cb(this));
    }

    async triggerOnError(error: unknown) {
        // allows for graceful cleanup of invalid tracks
        await this.triggerOnFinish();

        this._events.onError.forEach((cb) => cb(this, error));
    }
}

//------------------------------------------------------------//

export interface RemoteTrackMetadata extends TrackMetadata {
    url: string;
}

export class RemoteTrack extends Track<RemoteTrackMetadata> {}

export interface YouTubeTrackMetadata extends RemoteTrackMetadata {
    url: string; // guaranteed to be a youtube url
}

export class YouTubeTrack extends Track<YouTubeTrackMetadata> {
    async generateRelatedTrack() {
        const video_id = extractVideoIdFromYoutubeUrl(this.metadata.url);
        console.warn('video_id', { video_id });
        if (!video_id) throw new Error('Failed to extract video id from url');

        const related_video_id = await youtubeRelatedVideoId(video_id);
        console.warn('related_video_id', { related_video_id });
        if (!related_video_id) throw new Error('Failed to get related video id');

        const related_search_results = await MusicReconnaissance.search(`https://www.youtube.com/watch?v=${related_video_id}`);

        const related_search_result = related_search_results.at(0);
        if (!related_search_result) throw new Error('Failed to get related search result');

        return related_search_result;
    }
}

//------------------------------------------------------------//

export interface TextToSpeechTrackMetadata extends TrackMetadata {
    tts_text: string;
    tts_provider: string;
    tts_voice: string;
}

export class TextToSpeechTrack extends Track<TextToSpeechTrackMetadata> {
    public override volume_multiplier = 5.0;
}
