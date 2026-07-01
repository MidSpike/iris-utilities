//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::nonmax::NonMaxU16;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::helpers::bot::create_escaped_code_block;

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

    let guild_bans = guild.id.bans(&ctx.http(), None, Some(NonMaxU16::from(25))).await?;

    let guild_bans_string =
        guild_bans
        .iter()
        .map(
            |ban| {
                let user = &ban.user;
                let user_id = user.id.get();
                let user_name = &user.name;
                let reason = ban.reason.as_deref().unwrap_or("No reason provided.");
                let reason = create_escaped_code_block(None, &reason.to_string());

                format!("**{} ({})**\n{}", user_name, user_id, reason)
            }
        )
        .collect::<Vec<String>>()
        .join("\n");

    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Recent Bans")
            .description(guild_bans_string)
        )
    ).await?;

    Ok(())
}

/// Manage banned users in this guild.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Moderation",
        install_context = "Guild",
        interaction_context = "Guild",
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
