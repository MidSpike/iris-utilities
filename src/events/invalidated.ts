//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { ClientEventExport } from '@root/types/index';

import process from 'node:process';

import * as Discord from 'discord.js';

//------------------------------------------------------------//

const event_name = Discord.Events.Invalidated;
export default {
    name: event_name,
    async handler() {
        process.exit(1);
    },
} as ClientEventExport<typeof event_name>;
