//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import { Readable } from 'node:stream';

import ytdl from 'ytdl-core';

//------------------------------------------------------------//

export async function youtubeStream(
    youtube_url: string,
): Promise<Readable> {
    return ytdl(youtube_url, {
        lang: 'en',
        filter: 'audioonly',
        quality: 'highestaudio',
        // eslint-disable-next-line no-bitwise
        highWaterMark: 1<<25, // 32 MB
        requestOptions: {
            headers: {
                'Accept-Language': 'en-US,en;q=0.5',
                'User-Agent': process.env.YTDL_USER_AGENT,
                'Cookie': process.env.YTDL_COOKIE,
                'x-youtube-identity-token': process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN,
            },
        },
    });
}
