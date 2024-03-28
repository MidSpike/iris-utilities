//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::RoleId;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

use crate::Context;

//------------------------------------------------------------//

pub const LACKING_PERMISSIONS_MESSAGE: &str = "You do not have permission to perform this action.";

//------------------------------------------------------------//

pub fn is_guild_member_owner_of_guild(
    _ctx: &Context<'_>,
    guild: &serenity::Guild,
    member: &serenity::Member,
) -> bool {
    guild.owner_id == member.user.id
}

//------------------------------------------------------------//

type GuildMemberPermissionsChecker =
    fn(&serenity::Guild, &serenity::Member, serenity::Permissions) -> bool;

pub async fn assert_guild_member_permitted_by_discord(
    ctx: &Context<'_>,
    member: &serenity::Member,
    check_permissions: GuildMemberPermissionsChecker,
    lacking_permissions_message: Option<&str>,
) -> Result<(), Error> {
    let guild = ctx.guild().expect("There should be a guild.").clone();

    let Ok(permissions) = member.permissions(ctx) else {
        Err("Failed to get guild member permissions.")?
    };

    // check if the user is the guild owner
    if is_guild_member_owner_of_guild(ctx, &guild, &member) {
        return Ok(());
    }

    // check if the user is a guild administrator
    if permissions.administrator() {
        return Ok(());
    }

    // check if the user has the required permissions
    if check_permissions(&guild, &member, permissions) {
        return Ok(());
    }

    // the user does not have the required permissions
    Err(lacking_permissions_message.unwrap_or(LACKING_PERMISSIONS_MESSAGE))?
}

//------------------------------------------------------------//

pub async fn assert_member_above_other_member(
    ctx: &Context<'_>,
    member: &serenity::Member,
    other_member: &serenity::Member,
    error_message: &str,
) -> Result<(), Error> {
    let Some(guild) = ctx.guild() else {
        Err("Failed to get guild.")?
    };

    if member.user.id == other_member.user.id {
        Err(error_message)?
    }

    // check if the member is the guild owner
    if is_guild_member_owner_of_guild(ctx, &guild, &member) {
        return Ok(());
    }

    // check if the other member is the guild owner
    if is_guild_member_owner_of_guild(ctx, &guild, &other_member) {
        Err(error_message)?
    }

    let everyone_role = guild.roles.get(
        &RoleId::new(guild.id.get()) // equivalent to @everyone role id
    ).unwrap(); // should never fail

    let (_, member_highest_role_position) =
        member
        .highest_role_info(ctx)
        .unwrap_or((everyone_role.id, everyone_role.position));

    let (_, other_member_highest_role_position) =
        other_member
        .highest_role_info(ctx)
        .unwrap_or((everyone_role.id, everyone_role.position));

    if member_highest_role_position <= other_member_highest_role_position {
        Err(error_message)?
    }

    Ok(())
}
