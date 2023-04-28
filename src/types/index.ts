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

export type GuildId = string;

/**
 * The keys are modifiable, but the values are not as they are used in the database.
 */
export enum GuildConfigLoggingChannels {
    MemberJoin = 'member_join',
    MemberLeave = 'member_leave',
    MemberConnect = 'member_connect',
    MemberDisconnect = 'member_disconnect',
    MemberMove = 'member_move',
    MessageDeleted = 'message_deleted',
    MessageModified = 'message_modified',
}

/**
 * The keys are modifiable, but the values are not as they are used in the database.
 */
export enum GuildConfigChatAiMode {
    /**
     * The bot will not respond with chat ai in any channel.
     */
    Disabled = 'disabled',
    /**
     * All channels are enabled but require the bot to be mentioned.
     */
    MentionsOnly = 'mentions_only',
    /**
     * All channels are enabled but must be mentioned outside of enhanced channels.
     */
    MentionsAndEnhancedChannels = 'mentions_and_enhanced_channels',
    /**
     * Only enhanced channels are enabled, but the bot does not need to be mentioned.
     */
    EnhancedChannelsOnly = 'enhanced_channels_only',
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
        [v in GuildConfigLoggingChannels]?: string; // the channel id
    };
    url_blocking_enabled?: boolean;
    chat_ai_mode?: GuildConfigChatAiMode;
    chat_ai_channel_ids?: string[];
}

//------------------------------------------------------------//

export type UserId = string;

export interface UserSettings {
    [key: string]: unknown;
    user_id: UserId;
    voice_recognition_enabled?: boolean;
    gpt_access_enabled?: boolean;
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
};

export type Setting = {
    name: string;
    description: string;
    actions: SettingAction<Setting>[];
};
