//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Readable } from 'node:stream';

import ytdl from '@distube/ytdl-core';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const ytdl_cookie = parseEnvironmentVariable(EnvironmentVariableName.YoutubeCookie, 'string');

//------------------------------------------------------------//

const ytdl_agent = ytdl.createAgent([
    {
        name: 'cookie',
        value: ytdl_cookie,
    },
]);

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
        agent: ytdl_agent,
    });
}
