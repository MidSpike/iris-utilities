//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

export type GuildId = string;

//------------------------------------------------------------//

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

//------------------------------------------------------------//

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

export enum GuildConfigChatAiVariant {
    /**
     * The bot will use the default variant.
     */
    Default = 'default',
    /**
     * The bot will use the advanced variant.
     */
    Advanced = 'advanced',
}

//------------------------------------------------------------//

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
    chat_ai_variant?: GuildConfigChatAiVariant;
    chat_ai_channel_ids?: string[];
    chat_ai_token_usage_shown?: boolean;
}
