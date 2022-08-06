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

        // Ignore network errors as they happen way too often
        if (error.code === SpeechErrorCode.NetworkRequest) return;
        if (error.code === SpeechErrorCode.NetworkResponse) return;

        console.trace({
            error,
        });
    },
};
