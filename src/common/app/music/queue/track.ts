//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Readable } from 'node:stream';

import { AudioResource, createAudioResource, demuxProbe } from '@discordjs/voice';

//------------------------------------------------------------//

export interface TrackMetadata {
    [key: string]: unknown;
    title: string;
}

export class Track<
    MetaData extends TrackMetadata = TrackMetadata,
> {
    // eslint-disable-next-line no-use-before-define
    private _resource: AudioResource<Track<MetaData>> | undefined = undefined;

    public volume_multiplier = 1.0;

    constructor(
        private _metadata: MetaData,
        private _stream_creator: () => Promise<Readable | undefined>,
        public _events: {
            onStart: () => void;
            onFinish: () => void;
            onError: (error: unknown) => void;
        }
    ) {}

    get metadata(): MetaData {
        return this._metadata;
    }

    get resource(): AudioResource<Track<MetaData>> | undefined {
        return this._resource;
    }

    async initializeResource(): Promise<AudioResource<Track<MetaData>> | undefined> {
        await this.destroyResource(); // destroy any existing resource (useful for when the track is being re-used)

        let stream: Readable | undefined;
        try {
            stream = await this._stream_creator();

            if (!stream) {
                throw new Error('Failed to create stream');
            }

            this._resource = await demuxProbe(stream).then(
                (probe) => createAudioResource(probe.stream, {
                    inputType: probe.type,
                    inlineVolume: true, // allows volume to be adjusted while playing
                    metadata: this, // this track
                })
            );

            if (!this._resource) throw new Error('Failed to create audio resource');
        } catch (error: unknown) {
            this._events.onError(error);

            return undefined;
        }

        this._resource.volume!.setVolumeLogarithmic(0);

        return this._resource;
    }

    async fetchResource(): Promise<AudioResource<Track<MetaData>> | undefined> {
        return this._resource ?? await this.initializeResource() ?? undefined;
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

export interface RemoteTrackMetadata extends TrackMetadata {
    url: string;
}

export class RemoteTrack extends Track<RemoteTrackMetadata> {}

//------------------------------------------------------------//

export interface TextToSpeechTrackMetadata extends TrackMetadata {
    tts_text: string;
    tts_provider: string;
    tts_voice: string;
}

export class TextToSpeechTrack extends Track<TextToSpeechTrackMetadata> {
    public volume_multiplier = 5.0;
}
