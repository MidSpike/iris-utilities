//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::bot::create_escaped_code_block;

use crate::common::moderation;

//------------------------------------------------------------//

/// Undeafens a member in a voice channel.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
        user_cooldown = "5", // in seconds
        default_member_permissions = "DEAFEN_MEMBERS",
        required_bot_permissions = "DEAFEN_MEMBERS",
    )
]
pub async fn undeafen(
    ctx: Context<'_>,

    #[description = "The member to undeafen"]
    member: serenity::Member,

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

    // check if target member is in a voice channel
    let Some(_target_member_voice_state) = guild.voice_states.get(&target_member.user.id) else {
        ctx.send(
            poise::CreateReply::default().content(
                format!(
                    "{} is not in a voice channel.",
                    target_member.user.name,
                )
            )
        ).await?;

        return Ok(());
    };

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
                    "You were undeafened in {} by {} for:\n```{}```",
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
        .deafen(false)
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
                    "{} was undeafened by {} for:\n```{}```",
                    target_member.user.mention(),
                    executing_member.user.mention(),
                    create_escaped_code_block(None, &reason),
                )
            )
        )
    ).await?;

    Ok(())
}
