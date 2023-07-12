//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Readable } from 'node:stream';

import * as DiscordVoice from '@discordjs/voice';

import { extractYoutubeVideoId, findRelatedYoutubeVideoId } from '../searcher/youtube';

import { MusicReconnaissance } from '../music';

//------------------------------------------------------------//

type TrackEventOnStart = (track: Track) => Promise<void>;

type TrackEventOnFinish = (track: Track) => Promise<void>;

type TrackEventOnError = (track: Track, error: unknown) => Promise<void>;

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
    private _events: {
        onStart: TrackEventOnStart[];
        onFinish: TrackEventOnFinish[];
        onError: TrackEventOnError[];
    } = {
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

    async destroyResource(): Promise<void> {
        const stream = this._resource?.playStream;
        if (stream) {
            console.warn('Stream#destroyResource(): Destroying stream for', {
                track_name: this.metadata.title,
            });

            stream.destroy();
        }

        this._resource = undefined;
    }

    async onStart(cb: (track: this) => Promise<void>) {
        this._events.onStart.push(cb as TrackEventOnStart);
    }

    async onFinish(cb: (track: this) => Promise<void>) {
        this._events.onFinish.push(cb as TrackEventOnFinish);
    }

    async onError(cb: (track: this, error: unknown) => Promise<void>) {
        this._events.onError.push(cb as TrackEventOnError);
    }

    async triggerOnStart() {
        for (const event of this._events.onStart) {
            await event(this);
        }
    }

    async triggerOnFinish() {
        await this.destroyResource();

        for (const event of this._events.onFinish) {
            await event(this);
        }
    }

    async triggerOnError(error: unknown) {
        // attempt to perform cleanup
        await this.triggerOnFinish();

        for (const event of this._events.onError) {
            await event(this, error);
        }
    }
}

//------------------------------------------------------------//

export interface RemoteTrackMetadata extends TrackMetadata {
    url: string; // guaranteed to be a url
}

export class RemoteTrack extends Track<RemoteTrackMetadata> {}

//------------------------------------------------------------//

export interface SoundCloudTrackMetadata extends RemoteTrackMetadata {
    url: string; // guaranteed to be a soundcloud url
}

export class SoundCloudTrack extends Track<SoundCloudTrackMetadata> {}

//------------------------------------------------------------//

export interface YouTubeTrackMetadata extends RemoteTrackMetadata {
    url: string; // guaranteed to be a youtube url
}

export class YouTubeTrack extends Track<YouTubeTrackMetadata> {
    async generateRelatedTrack(): Promise<YouTubeTrack> {
        const video_id = extractYoutubeVideoId(this.metadata.url);
        console.warn('generateRelatedTrack(): video_id', { video_id });
        if (!video_id) throw new Error('Failed to extract video id from url');

        const related_video_id = await findRelatedYoutubeVideoId(video_id);
        console.warn('generateRelatedTrack(): related_video_id', { related_video_id });
        if (!related_video_id) throw new Error('Failed to get related video id');

        const related_search_results = await MusicReconnaissance.search(`https://www.youtube.com/watch?v=${related_video_id}`, 'youtube') as YouTubeTrack[];

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
