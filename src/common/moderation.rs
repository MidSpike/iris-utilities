//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

use crate::Context;

//------------------------------------------------------------//

pub const LACKING_PERMISSIONS_MESSAGE: &str = "You do not have permission to perform this action.";

//------------------------------------------------------------//

type GuildMemberPermittedPredicate = fn(
    &serenity::Guild,
    &serenity::GuildChannel,
    &serenity::Member,
    &serenity::Permissions
) -> Result<bool, Error>;

pub async fn assert_guild_member_permitted_by_discord(
    ctx: &Context<'_>,
    member: &serenity::Member,
    further_check: GuildMemberPermittedPredicate,
    not_permitted_message: Option<&str>,
) -> Result<(), Error> {
    let guild = ctx.guild().expect("There should be a guild.");

    let guild_channel =
        ctx.channel().await
        .map(|c| c.guild()).flatten()
        .expect("This channel should be in a guild.");

    // Guild owners are expected to explicitly assign permission to themselves.

    let member_perms_in_channel = guild.user_permissions_in(&guild_channel, member);

    // check if the user is a guild administrator
    if member_perms_in_channel.administrator() {
        return Ok(());
    }

    // check if the user has the required permissions
    if further_check(&guild, &guild_channel, &member, &member_perms_in_channel)? {
        return Ok(());
    }

    // the user does not have the required permissions
    Err(Error::from(not_permitted_message.unwrap_or(LACKING_PERMISSIONS_MESSAGE)))
}

//------------------------------------------------------------//

pub async fn assert_member_above_other_member(
    ctx: &Context<'_>,
    member: &serenity::Member,
    other_member: &serenity::Member,
    error_message: &str,
) -> Result<(), Error> {
    let Some(guild) = ctx.guild() else {
        return Err(Error::from("Failed to get guild."));
    };

    if member.user.id == other_member.user.id {
        return Err(Error::from("Member is the same as the other member."));
    }

    // Guild owner is considered as above all members, even if highest roles do not reflect that.
    if member.user.id == guild.owner_id {
        return Ok(());
    }

    // The other member could be the guild owner, if so, the member cannot be above them.
    if other_member.user.id == guild.owner_id {
        return Err(Error::from(error_message));
    }

    // Per https://docs.discord.com/developers/topics/permissions#role-object
    // > "The `@everyone` role has the same ID as the guild it belongs to."
    let everyone_role =
        guild.roles.get(&serenity::RoleId::new(guild.id.get()))
        .expect("Guild should have an everyone role.");

    let member_highest_role =
        guild.member_highest_role(member)
        .unwrap_or(everyone_role);

    let other_member_highest_role =
        guild.member_highest_role(other_member)
        .unwrap_or(everyone_role);

    if member_highest_role.position <= other_member_highest_role.position {
        return Err(Error::from(error_message));
    }

    Ok(())
}
