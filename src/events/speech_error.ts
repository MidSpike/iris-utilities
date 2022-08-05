//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { SpeechError, SpeechErrorCode } from 'discord-speech-recognition';

//------------------------------------------------------------//

export default {
    name: 'speechError',
    async handler(
        discord_client: Discord.Client,
        error: SpeechError,
    ) {
        if (!discord_client.isReady()) return;

        if (error.code === SpeechErrorCode.NetworkRequest) return; // ignore network errors, they happen way too often

        console.trace({
            error,
        });
    },
};
