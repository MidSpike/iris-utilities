//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import * as Discord from 'discord.js';

//------------------------------------------------------------//

export function isMemberAboveOtherMember(
    member: Discord.GuildMember,
    other_member: Discord.GuildMember,
): boolean {
    if (member.id === other_member.id) return false;
    if (member.guild.id !== other_member.guild.id) return false;

    if (member.id === member.guild.ownerId) return true;
    if (other_member.id === member.guild.ownerId) return false;

    const member_highest_role = member.roles.highest;
    const other_member_highest_role = other_member.roles.highest;

    if (member_highest_role === other_member_highest_role) return false;
    if (member_highest_role.comparePositionTo(other_member_highest_role) > 0) return true;

    return false;
}
