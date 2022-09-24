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
}

//------------------------------------------------------------//

export type GuildId = string;

/**
 * Do not alter pre-existing values contained in this enum.
 */
export enum GuildConfigLoggingChannels {
    MEMBER_JOIN = 'member_join',
    MEMBER_LEAVE = 'member_leave',
    MEMBER_CONNECT = 'member_connect',
    MEMBER_DISCONNECT = 'member_disconnect',
    MEMBER_MOVE = 'member_move',
    MESSAGE_DELETED = 'message_deleted',
    MESSAGE_MODIFIED = 'message_modified',
}

export type GuildConfigTemplate = {
    _creation_epoch: number;
    _last_modified_epoch: number;
}

export interface GuildConfig extends GuildConfigTemplate {
    [key: string]: unknown;
    guild_id: GuildId;
    staff_role_ids?: string[];
    admin_role_ids?: string[];
    logging_channels?: {
        [v in GuildConfigLoggingChannels]?: string;
    };
    url_blocking_enabled?: boolean;
}

//------------------------------------------------------------//

export type UserId = string;

export interface UserSettings {
    [key: string]: unknown;
    user_id: UserId;
    voice_recognition_enabled?: boolean;
    donator?: boolean;
}

//------------------------------------------------------------//

export type SettingAction<Setting> = {
    name: string;
    description: string;
    options: Discord.ApplicationCommandOptionData[];
    handler: (
        setting: Setting,
        guild_config: GuildConfig,
        command_interaction: Discord.CommandInteraction<'cached'>
    ) => Promise<unknown>;
}

export type Setting = {
    name: string;
    actions: SettingAction<Setting>[];
}
