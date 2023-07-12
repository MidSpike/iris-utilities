//------------------------------------------------------------//
//        Copyright (c) MidSpike. All rights reserved.        //
//------------------------------------------------------------//

import { UserConfig } from '@root/types';

import * as Discord from 'discord.js';

import { EnvironmentVariableName, parseEnvironmentVariable } from '@root/common/lib/utilities';

import { go_mongo_db } from '@root/common/lib/go_mongo_db';

//------------------------------------------------------------//

const db_name = parseEnvironmentVariable(EnvironmentVariableName.MongoDatabaseName, 'string');

const db_user_configs_collection_name = parseEnvironmentVariable(EnvironmentVariableName.MongoUserConfigsCollectionName, 'string');

const db_super_people_collection_name = parseEnvironmentVariable(EnvironmentVariableName.MongoSuperPeopleCollectionName, 'string');

//------------------------------------------------------------//

/**
 * Check the database to see if the user is a super person.
 * @param user_id the user's discord id
 */
export async function doesUserHaveSuperPersonStatus(
    user_id: string,
): Promise<boolean> {
    const db_find_cursor_super_person_config = await go_mongo_db.find(db_name, db_super_people_collection_name, {
        'discord_user_id': user_id,
    }, {
        projection: {
            '_id': false, // don't return the `_id` field
        },
    });

    const db_super_person_config = await db_find_cursor_super_person_config.next() as { discord_user_id: string } | null;

    return Boolean(db_super_person_config ?? false);
}

//------------------------------------------------------------//

/**
 * Check the database to see if the user is permitted access to donator features.
 * @param user_id the user's discord id
 */
export async function doesUserHaveDonatorStatus(
    user_id: string,
): Promise<boolean> {
    const member_is_super_person = await doesUserHaveSuperPersonStatus(user_id);
    if (member_is_super_person) return true;

    const db_find_cursor_user_config = await go_mongo_db.find(db_name, db_user_configs_collection_name, {
        'user_id': user_id,
    }, {
        projection: {
            '_id': false, // don't return the `_id` field
        },
    });

    const db_user_config = await db_find_cursor_user_config.next() as UserConfig | null;
    if (!db_user_config) return false; // assume the user is not a donator if they don't have a config

    return db_user_config.donator ?? false;
}

//------------------------------------------------------------//

/**
 * Check the database to see if the user has voice recognition access available and enabled.
 * @param user_id the user's discord id
 */
export async function doesUserHaveVoiceRecognitionEnabled(
    user_id: string,
): Promise<boolean> {
    const member_is_donator = await doesUserHaveDonatorStatus(user_id);
    if (!member_is_donator) return false;

    const db_find_cursor_user_config = await go_mongo_db.find(db_name, db_user_configs_collection_name, {
        'user_id': user_id,
    }, {
        projection: {
            '_id': false, // don't return the `_id` field
        },
    });

    const db_user_config = await db_find_cursor_user_config.next() as UserConfig | null;
    if (!db_user_config) return false; // opt-in is required, default to disabled when non-existent

    return db_user_config.voice_recognition_enabled ?? false; // opt-in is required, default to disabled
}

//------------------------------------------------------------//

/**
 * Check the database to see if the user has artificial intelligence access enabled.
 * @param user_id the user's discord id
 */
export async function doesUserHaveArtificialIntelligenceAccess(
    user_id: string,
): Promise<boolean> {
    const member_is_donator = await doesUserHaveDonatorStatus(user_id);
    if (!member_is_donator) return false;

    const db_find_cursor_user_config = await go_mongo_db.find(db_name, db_user_configs_collection_name, {
        'user_id': user_id,
    }, {
        projection: {
            '_id': false, // don't return the `_id` field
        },
    });

    const db_user_config = await db_find_cursor_user_config.next() as UserConfig | null;
    if (!db_user_config) return false; // default to disabled when non-existent

    return db_user_config.gpt_access_enabled ?? false; // default to disabled
}

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

//------------------------------------------------------------//

/**
 * Returns `true` if the member meets one of the following conditions:
 * - the member is the owner of the guild
 * - the member has Administrator permissions
 * - the member is a super person (an admin for this bot)
 * - the member has the specified permission flag bit
 * @param member the member to check
 * @param permission_flag_bit the permission to check for
 */
export async function doesMemberHavePermission(
    member: Discord.GuildMember,
    permission_flag_bit: bigint,
): Promise<boolean> {
    if (member.id === member.guild.ownerId) return true;

    if (member.permissions.has(Discord.PermissionFlagsBits.Administrator)) return true;

    const member_is_super_person = await doesUserHaveSuperPersonStatus(member.id);
    if (member_is_super_person) return true;

    return member.permissions.has(permission_flag_bit, true);
}
