//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import {
    AudioResource,
} from '@discordjs/voice';

//------------------------------------------------------------//

export interface TrackMetadata {
    [key: string]: unknown;
    title: string;
}

export type BaseResourceCreator = () => Promise<AudioResource>;

export class Track<
    MetaData extends TrackMetadata = TrackMetadata,
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

    public volume_multiplier = 1.0;

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
        this._resource = undefined;
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
