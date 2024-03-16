//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::moderation;

//------------------------------------------------------------//

/// Lists the most recent bans.
#[poise::command(slash_command)]
pub async fn list(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
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
    )
]
pub async fn bans(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
