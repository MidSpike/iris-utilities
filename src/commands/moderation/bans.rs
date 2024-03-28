//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

/// Lists the most recent bans.
#[poise::command(slash_command)]
pub async fn list(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let _executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild_bans = guild.bans(
        &ctx,
        None,
        Some(25),
    ).await?;

    let guild_bans_string =
        guild_bans
        .iter()
        .map(
            |ban| {
                let user = &ban.user;
                let user_id = user.id.get();
                let user_name = user.name.clone();
                let reason = ban.reason.clone().unwrap_or("No reason provided.".into());

                format!("**{} ({})**\n```{}```", user_name, user_id, reason)
            }
        )
        .collect::<Vec<String>>()
        .join("\n");

    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Recent Bans")
            .description(guild_bans_string)
        )
    ).await?;

    Ok(())
}

/// Helpful collection of commands for managing bans.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
        subcommands("list"),
        user_cooldown = "10", // in seconds
        default_member_permissions = "VIEW_AUDIT_LOG | BAN_MEMBERS",
        required_bot_permissions = "VIEW_AUDIT_LOG | BAN_MEMBERS",
    )
]
pub async fn bans(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
