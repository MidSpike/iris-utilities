//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

//------------------------------------------------------------//

export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

//------------------------------------------------------------//

export type DiscordClientWithSharding = Discord.Client<true> & {
    shard: Discord.ShardClientUtil;
};

//------------------------------------------------------------//

export type ClientEventExport<EventName extends keyof Discord.ClientEvents> = {
    name: string;
    handler(
        discord_client: Discord.Client,
        ...args: Discord.ClientEvents[EventName]
    ): Promise<void>;
};

//------------------------------------------------------------//

export * from './guild_config';

export * from './user_config';

export * from './settings';
