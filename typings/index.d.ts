//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

//------------------------------------------------------------//

export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

//------------------------------------------------------------//

export type ClientEventExport<EventName extends keyof Discord.ClientEvents> = {
    name: string;
    handler(
        discord_client: Discord.Client,
        ...args: Discord.ClientEvents[EventName],
    ): Promise<void>;
}

//------------------------------------------------------------//

export type GuildId = string;

export type GuildConfigTemplate = {
    _creation_epoch: number;
    _last_modified_epoch: number;
}

export interface GuildConfig extends GuildConfigTemplate {
    [key: string]: unknown;
    guild_id: GuildId;
    staff_role_ids?: string[];
    admin_role_ids?: string[];
    logging_member_retention_channel_id?: string;
    logging_message_reactions_channel_id?: string;
    logging_commands_channel_id?: string;
    logging_moderation_channel_id?: string;
    url_blocking_enabled?: boolean;
}

//------------------------------------------------------------//

export type UserId = string;

export type UserConfigTemplate = {
    _creation_epoch: number;
    _last_modified_epoch: number;
}

export interface UserConfig extends UserConfigTemplate {
    [key: string]: unknown;
    user_id: UserId;
    is_blacklisted?: boolean;
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
