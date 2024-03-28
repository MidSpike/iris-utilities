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

//------------------------------------------------------------//

/// Configures slowmode for the current channel.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
        user_cooldown = "10", // in seconds
        default_member_permissions = "MANAGE_CHANNELS",
        required_bot_permissions = "MANAGE_CHANNELS",
    )
]
pub async fn slowmode(
    ctx: Context<'_>,

    #[min = 0]
    #[max = 21600] // 6 hours in seconds
    #[description = "Duration in seconds (`0` to disable)"]
    duration: u16,

    #[description = "Why this action was performed"]
    reason: Option<String>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let _guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let reason = reason.unwrap_or("A reason was not provided.".to_string());

    let edit_result = ctx.channel_id().edit(
        &ctx,
        serenity::EditChannel::default()
        .rate_limit_per_user(duration)
        .audit_log_reason(&reason)
    ).await;

    let embed = match edit_result {
        Err(why) => {
            eprintln!("Error configuring slow mode: {:?}", why);

            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Moderation")
            .description(
                "Failed to configure slow mode.\nTry checking my permissions.".to_string()
            )
        },
        Ok(_) => {
            if duration == 0 {
                // slow mode disabled
                serenity::CreateEmbed::default()
                .color(BrandColor::new().get())
                .title("Moderation")
                .description(
                    format!(
                        "{} disabled slow mode in {} for:\n{}",
                        executing_member.user.mention(),
                        ctx.channel_id().mention(),
                        create_escaped_code_block(None, &reason),
                    )
                )
            } else {
                // slow mode enabled with duration
                serenity::CreateEmbed::default()
                .color(BrandColor::new().get())
                .title("Moderation")
                .description(
                    format!(
                        "{} enabled slow mode of {} seconds in {} for:\n{}",
                        executing_member.user.mention(),
                        duration,
                        ctx.channel_id().mention(),
                        create_escaped_code_block(None, &reason),
                    )
                )
            }
        },
    };

    ctx.send(
        poise::CreateReply::default().embed(embed)
    ).await?;

    Ok(())
}
