//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { GuildConfigLoggingChannels } from '@root/types/index';

import * as Discord from 'discord.js';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

//------------------------------------------------------------//

export async function guildLogger(
    guild: Discord.Guild,
    logging_location: GuildConfigLoggingChannels,
    message_options: Discord.MessageOptions,
): Promise<boolean> {
    try {
        await guild.fetch();
    } catch (error) {
        return false;
    }

    if (!guild.available) return false;

    const guild_config = await GuildConfigsManager.fetch(guild.id);
    if (!guild_config) return false;

    const logging_channel_ids = guild_config.logging_channels;
    if (!logging_channel_ids) return false;

    const logging_channel_id = logging_channel_ids[logging_location];
    if (!logging_channel_id) return false;

    const logging_channel = await guild.channels.fetch(logging_channel_id);
    if (!logging_channel?.isTextBased()) return false;

    try {
        await logging_channel.send(message_options);
    } catch (error) {
        return false;
    }

    return true;
}