//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import process from 'node:process';

import * as Discord from 'discord.js';

import { go_mongo_db } from '@root/common/lib/go_mongo_db';

//------------------------------------------------------------//

const db_name = process.env.MONGO_DATABASE_NAME as string;
if (!db_name?.length) throw new TypeError('MONGO_DATABASE_NAME is not defined');

const db_super_people_collection_name = process.env.MONGO_SUPER_PEOPLE_COLLECTION_NAME as string;
if (!db_super_people_collection_name?.length) throw new TypeError('MONGO_SUPER_PEOPLE_COLLECTION_NAME is not defined');

//------------------------------------------------------------//

/**
 * @param member the member that should be above the other member
 * @param other_member the other member that should be below the member
 * @param compare_admins when true, if both members have 'Administrator' permission, factor hierarchy into consideration
 */
export function isMemberAboveOtherMember(
    member: Discord.GuildMember,
    other_member: Discord.GuildMember,
    compare_admins: boolean = true,
): boolean {
    // check if both members are from the same guild
    if (member.guild.id !== other_member.guild.id) return false;

    // check if both members are the same member
    if (member.id === other_member.id) return false;

    // check if either member is the guild owner
    if (member.id === member.guild.ownerId) return true;
    if (other_member.id === member.guild.ownerId) return false;

    // when `compare_admins === false`, treat members with 'Administrator' as equal in hierarchy
    if (
        !compare_admins &&
        member.permissions.has(Discord.PermissionFlagsBits.Administrator) &&
        other_member.permissions.has(Discord.PermissionFlagsBits.Administrator)
    ) return false;

    const member_highest_role = member.roles.highest;
    const other_member_highest_role = other_member.roles.highest;

    if (member_highest_role.id === other_member_highest_role.id) return false;

    if (member_highest_role.comparePositionTo(other_member_highest_role) > 0) return true;

    return false;
}

/**
 * This function will always return `true` if the member meets one of the following conditions:
 * - the member is the owner of the guild
 * - the member has Administrator permissions
 * - the member is a super person (an admin for this bot)
 * @param member the member to check
 * @param permission_flag_bit the permission to check for
 */
export async function doesMemberHavePermission(
    member: Discord.GuildMember,
    permission_flag_bit: bigint,
): Promise<boolean> {
    if (member.id === member.guild.ownerId) return true;

    if (member.permissions.has(Discord.PermissionFlagsBits.Administrator)) return true;

    const member_is_super_person = (await go_mongo_db.count(db_name, db_super_people_collection_name, { 'discord_user_id': member.id })) > 0;
    if (member_is_super_person) return true;

    return member.permissions.has(permission_flag_bit, true);
}