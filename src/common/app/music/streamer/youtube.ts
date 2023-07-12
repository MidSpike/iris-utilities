//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Readable } from 'node:stream';

import ytdl from 'ytdl-core';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const ytdl_user_agent = parseEnvironmentVariable(EnvironmentVariableName.YoutubeUserAgent, 'string');

const ytdl_cookie = parseEnvironmentVariable(EnvironmentVariableName.YoutubeCookie, 'string');

const ytdl_x_youtube_identity_token = parseEnvironmentVariable(EnvironmentVariableName.YoutubeIdentityToken, 'string');

//------------------------------------------------------------//

export async function youtubeStream(
    youtube_url: string | URL,
): Promise<Readable> {
    const youtube_url_string = youtube_url.toString();

    return ytdl(youtube_url_string, {
        lang: 'en',
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 32 * (1024 ** 2), // 32 Megabytes
        requestOptions: {
            headers: {
                'Accept-Language': 'en-US,en;q=0.5',
                'User-Agent': ytdl_user_agent,
                'Cookie': ytdl_cookie,
                'x-youtube-identity-token': ytdl_x_youtube_identity_token,
            },
        },
    });
}
