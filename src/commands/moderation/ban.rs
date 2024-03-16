//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::moderation;

use crate::common::helpers::bot::create_escaped_code_block;

//------------------------------------------------------------//

/// Bans a user from the server.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
    )
]
pub async fn ban(
    ctx: Context<'_>,
    #[description = "The member to ban"] member: serenity::Member,
    #[description = "Why this action was performed"] reason: Option<String>,
) -> Result<(), Error> {
    let target_member = member; // renamed to avoid confusion

    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let my_id = ctx.serenity_context().cache.current_user().id;

    let my_guild_member =
        guild
        .member(&ctx, my_id).await
        .expect("I should be in this guild.")
        .clone();

    // check if executing member has discord permission to perform this action at all
    moderation::assert_guild_member_permitted_by_discord(
        &ctx,
        &executing_member,
        |_guild, _executing_member, permissions| {
            permissions.ban_members()
        },
        None,
    ).await?;

    // check if executing member is above target member in the role hierarchy
    moderation::assert_member_above_other_member(
        &ctx,
        &executing_member,
        &target_member,
        "You cannot perform an action on a member that has an equal or higher role than you.",
    ).await?;

    // check if this bot is above target member in the role hierarchy
    moderation::assert_member_above_other_member(
        &ctx,
        &my_guild_member,
        &target_member,
        "I cannot perform an action on a member that has an equal or higher role than me.",
    ).await?;

    let reason = reason.unwrap_or("A reason was not provided.".to_string());

    target_member.user.dm(
        &ctx,
        serenity::CreateMessage::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("{} - Moderation", guild.name))
            .description(
                format!(
                    "You were banned from {} by {} for:\n```{}```",
                    guild.name,
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await.ok(); // ignore errors

    // Hard-coded for now to not delete any messages.
    // In the future, this should be a configurable option.
    let delete_message_days = 0;

    guild.ban_with_reason(&ctx, &target_member.user.id, delete_message_days, &reason).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Moderation")
            .description(
                format!(
                    "{} was banned by {} for:\n```{}```",
                    target_member.user.mention(),
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await?;

    Ok(())
}
