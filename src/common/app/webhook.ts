//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import axios from 'axios';

import * as Discord from 'discord.js';

//------------------------------------------------------------//

export async function sendWebhookMessage(
    webhook_url: string,
    message: Partial<Discord.APIMessage>,
): Promise<boolean> {
    try {
        await axios({
            method: 'POST',
            url: webhook_url,
            data: message,
            validateStatus: (status_code) => status_code >= 200 && status_code < 300,
        });
    } catch {
        return false;
    }

    return true;
}
