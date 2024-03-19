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

/// Puts a member in timeout.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
        user_cooldown = "3", // in seconds
    )
]
pub async fn timeout(
    ctx: Context<'_>,

    #[description = "The member to timeout"]
    member: serenity::Member,

    #[min = 1]
    #[max = 672]
    #[description = "How many hours (max 28 days) to timeout"]
    hours: i64,

    #[description = "Why this action was performed"]
    reason: Option<String>,
) -> Result<(), Error> {
    let mut target_member = member; // renamed to avoid confusion

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
            permissions.moderate_members()
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

    let max_hours = 28 * 24; // 28 days is the maximum duration that discord allows

    let hours = hours.min(max_hours).max(1); // Ensure timeout duration is acceptable by discord

    let chrono_now = chrono::Utc::now();

    let chrono_min_duration = chrono::Duration::try_minutes(1).expect("this should not fail");
    let chrono_max_duration = chrono::Duration::try_hours(max_hours).expect("this should not fail");

    let chrono_duration =
        chrono::Duration::try_hours(hours)
        .expect("this should not fail")
        .min(chrono_max_duration)
        .max(chrono_min_duration);

    let chrono_until = chrono_now + chrono_duration;

    let serenity_until_timestamp =
        serenity::Timestamp::from_millis(chrono_until.timestamp_millis())?;

    target_member.user.dm(
        &ctx,
        serenity::CreateMessage::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("{} - Moderation", guild.name))
            .description(
                format!(
                    "You were timed out for {} hours in {} by {} for:\n```{}```",
                    hours,
                    guild.name,
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await.ok(); // ignore errors

    target_member.edit(
        &ctx,
        serenity::EditMember::default()
        .disable_communication_until_datetime(serenity_until_timestamp)
        .audit_log_reason(&reason),
    ).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Moderation")
            .description(
                format!(
                    "{} was timed out for {} hours by {} for:\n```{}```",
                    target_member.user.mention(),
                    hours,
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await?;

    Ok(())
}
