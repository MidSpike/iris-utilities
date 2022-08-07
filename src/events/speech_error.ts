//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import * as DiscordSpeechRecognition from '@midspike/discord-speech-recognition';

//------------------------------------------------------------//

export default {
    name: DiscordSpeechRecognition.Events.Error,
    async handler(
        discord_client: Discord.Client,
        error: DiscordSpeechRecognition.SpeechError,
    ) {
        if (!discord_client.isReady()) return;

        // Ignore network errors as they happen way too often
        if (error.code === DiscordSpeechRecognition.SpeechErrorCode.NetworkRequest) return;
        if (error.code === DiscordSpeechRecognition.SpeechErrorCode.NetworkResponse) return;

        console.trace({
            error,
        });
    },
};
