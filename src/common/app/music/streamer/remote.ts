//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { Readable } from 'node:stream';

import axios from 'axios';

//------------------------------------------------------------//

export async function remoteStream(
    remote_stream_url: string,
): Promise<Readable> {
    return axios({
        method: 'get',
        url: remote_stream_url,
        responseType: 'stream',
        validateStatus: (status_code) => status_code >= 200 && status_code < 300,
    }).then((response) => {
        const content_type = response.headers['content-type'] as string | undefined;
        if (!content_type) throw new Error('Missing Content-Type header for remote stream response');

        if (!content_type.includes('audio')) throw new Error('Content-Type header for remote stream response is not audio related');

        return response.data as Readable;
    });
}
