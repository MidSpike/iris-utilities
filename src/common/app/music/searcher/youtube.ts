//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import axios from 'axios';

import { randomItemFromArray } from '@root/common/lib/utilities';

//------------------------------------------------------------//

const yt_api_key = process.env.YOUTUBE_API_KEY as string;
if (!yt_api_key?.length) throw new TypeError('YOUTUBE_API_KEY is not defined');

//------------------------------------------------------------//

export function extractVideoIdFromYoutubeUrl(
    yt_videO_url: string,
): string | undefined {
    let url: URL;
    try {
        url = new URL(yt_videO_url);
    } catch {
        return undefined;
    }

    switch (url.hostname) {
        case 'www.youtube.com':
        case 'youtube.com': {
            return url.searchParams.get('v') || undefined;
        }
        case 'youtu.be': {
            return url.pathname.slice(1);
        }
        default: {
            return undefined;
        }
    }
}

export async function youtubeRelatedVideoId(
    youtube_video_id: string,
): Promise<string | undefined> {
    const url_search_params = new URLSearchParams({
        part: 'id',
        maxResults: '10',
        relatedToVideoId: encodeURIComponent(youtube_video_id),
        type: 'video',
        key: encodeURIComponent(yt_api_key),
    });

    const yt_response_data = await axios({
        method: 'get',
        url: `https://youtube.googleapis.com/youtube/v3/search?${url_search_params}`,
        validateStatus: (status_code) => status_code === 200,
    }).then(
        (response) => response.data as {
            items: {
                id: {
                    videoId: string;
                };
            }[];
        }
    ).catch(
        (error) => {
            console.warn(error);

            return undefined;
        }
    );

    if (!yt_response_data) return undefined;

    // for some reason, the first video is usually not playable (e.g. an advertisement)
    const related_videos = yt_response_data.items.slice(1); // remove the first video

    return randomItemFromArray(related_videos)?.id?.videoId;
}
