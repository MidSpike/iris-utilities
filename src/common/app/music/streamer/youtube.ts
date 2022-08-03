//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import { Readable } from 'node:stream';

import ytdl from 'ytdl-core';

//------------------------------------------------------------//

const ytdl_user_agent = process.env.YTDL_USER_AGENT as string;
if (!ytdl_user_agent?.length) throw new Error('YTDL_USER_AGENT is not defined or is empty');

const ytdl_cookie = process.env.YTDL_COOKIE as string;
if (!ytdl_cookie?.length) throw new Error('YTDL_COOKIE is not defined or is empty');

const ytdl_x_youtube_identity_token = process.env.YTDL_X_YOUTUBE_IDENTITY_TOKEN as string;
if (!ytdl_x_youtube_identity_token?.length) throw new Error('YTDL_X_YOUTUBE_IDENTITY_TOKEN is not defined or is empty');

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
