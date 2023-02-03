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

export function extractYoutubeVideoId(
    youtube_url: string,
): string | undefined {
    let youtube_url_instance: URL;

    try {
        youtube_url_instance = new URL(youtube_url);
    } catch (error) {
        console.warn('Failed to parse URL:', youtube_url);

        return undefined;
    }

    const url_path = youtube_url_instance.pathname.split('/');

    switch (youtube_url_instance.hostname) {
        case 'www.youtube.com':
        case 'youtube.com': {
            switch (url_path.at(1)) {
                case 'watch':
                case 'embed': {
                    if (youtube_url_instance.searchParams.has('v')) {
                        return youtube_url_instance.searchParams.get('v')!;
                    }

                    const video_id = url_path.at(2);
                    if (video_id?.length) {
                        return video_id;
                    }

                    break;
                }

                default: {
                    break;
                }
            }

            break;
        }

        case 'youtu.be': {
            const video_id = url_path.at(1);
            if (video_id?.length) {
                return video_id;
            }

            break;
        }

        default: {
            break;
        }
    }

    return undefined;
}

export async function findRelatedYoutubeVideoId(
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
