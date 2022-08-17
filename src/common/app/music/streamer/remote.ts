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
    }).then((response) => response.data as Readable);
}
