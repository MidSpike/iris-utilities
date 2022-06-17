//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

import { delay } from '@root/common/lib/utilities';

import { GuildConfigsManager } from '@root/common/app/guild_configs';

//------------------------------------------------------------//

export default async function urlBlockingHandler(
    discord_client: Discord.Client<true>,
    message: Discord.Message<true>,
): Promise<void> {
    if (!message.inGuild()) return; // don't respond to direct messages
    if (!message.deletable) return; // unable to delete this message
    if (!message.member) return; // unable to get the member

    /* fetch the guild config */
    const guild_config = await GuildConfigsManager.fetch(message.guild.id);
    if (!guild_config.url_blocking_enabled) return; // url blocking is disabled

    /* fetch the member's permissions */
    const member_permissions = message.channel.permissionsFor(message.member);
    const member_has_bypass_permission = member_permissions.has([
        Discord.PermissionFlagsBits.ManageMessages,
    ], true);
    if (member_has_bypass_permission) return; // member has bypass permission

    /* fetch the bot member in the guild */
    const bot_member = await message.guild.members.fetch(discord_client.user.id);
    if (!bot_member) return; // this shouldn't happen, but just in-case

    /* check if the bot is allowed to manage messages */
    const bot_permissions = message.channel.permissionsFor(bot_member, true);
    const bot_can_manage_messages = bot_permissions.has(Discord.PermissionFlagsBits.ManageMessages, true);
    if (!bot_can_manage_messages) return; // unable to manage messages

    /* check if the message might contain a URL */
    const message_might_contain_url_regex = /\S*:.*\/.*\/.+\..+\/?/gi; // this is very sensitive and may incorrectly detect URLs
    const message_might_contain_url = message_might_contain_url_regex.test(message.content);
    if (!message_might_contain_url) return; // no URL found

    /* delay to make the discord api happy */
    await delay(250);

    /* delete the message */
    message.delete().then(() => {
        console.log(`<DC S#(${discord_client.shard!.ids.join(', ')})> deleted message sent by ${message.author.tag} that contained a potential URL.`);
    }).catch((error) => {
        console.error(`<DC S#(${discord_client.shard!.ids.join(', ')})> failed to delete message sent by ${message.author.tag} that contained a potential URL.`, error);
    });
}
