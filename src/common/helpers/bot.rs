//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::CreateInvite;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

pub fn create_escaped_code_block(
    language: Option<&String>,
    content: &String,
) -> String {
    // Replace all triple backticks with zero width space joined triple backticks.
    // This prevents the code block from being parsed by Discord.
    let content = content.replace("```", "`\u{200B}`\u{200B}`");

    // Default to an empty string if no language is provided.
    // This will result in a plain text code block.
    let default_language = String::from("");
    let language = language.unwrap_or(&default_language);

    format!("```{}\n{}```", language, content)
}

//------------------------------------------------------------//

pub fn generate_bot_invite_url(
    bot_id: u64,
) -> String {
    let scopes = [
        serenity::Scope::Bot,
        serenity::Scope::ApplicationsCommands,
    ]
    .iter()
    .map(|scope| scope.to_string())
    .collect::<Vec<String>>()
    .join("+");

    let permissions = serenity::Permissions::ADMINISTRATOR.bits();

    format!(
        "https://discord.com/oauth2/authorize?client_id={}&scope={}&permissions={}",
        bot_id,
        scopes,
        permissions
    )
}

//------------------------------------------------------------//

async fn create_permanent_guild_invite(
    ctx: Context<'_>,
    guild_id: serenity::GuildId,
) -> Result<Option<serenity::RichInvite>, Error> {
    // use http to work across shards
    let guild =
        ctx
        .serenity_context()
        .http
        .get_guild(guild_id)
        .await?;

    let guild_channels = guild.channels(&ctx.serenity_context().http).await?;

    let invite = match guild_channels.values().next() {
        Some(first_channel) => Some(
            first_channel.create_invite(
                &ctx,
                CreateInvite::default().temporary(false)
            ).await?
        ),
        None => None,
    };

    Ok(invite)
}

pub async fn fetch_my_guild_invite_url(
    ctx: Context<'_>,
) -> Result<String, Error> {
    let fallback_invite_url = String::from("https://support.discord.com/");

    let me = ctx.serenity_context().http.get_current_application_info().await?;

    let Some(guild_id) = me.guild_id else {
        eprintln!(
            "fetch_my_guild_invite():\
            \nSupport guild id not found for this bot, defaulting to 'support.discord.com'.\
            \nConsider verifying this bot and configuring a support server for it."
        );

        return Ok(fallback_invite_url);
    };

    let guild_invites =
        ctx
        .serenity_context()
        .http
        .get_guild_invites(guild_id)
        .await?;

    let potential_permanent_guild_invite = guild_invites.into_iter().find(|g| !g.temporary);

    let guild_invite = match potential_permanent_guild_invite {
        Some(invite) => Some(invite),
        None => create_permanent_guild_invite(ctx, guild_id).await?,
    };

    match guild_invite {
        Some(invite) => Ok(invite.url()),
        None => Ok(fallback_invite_url),
    }
}
