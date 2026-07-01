//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

pub mod ai_chat;

pub mod logging_channels;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use ai_chat::{ai_chat_mode, ai_chat_channels};

use logging_channels::{logging_channels};

//------------------------------------------------------------//

/// Configure this guild's preferences and settings.
#[
    poise::command(
        slash_command,
        guild_only,
        subcommands("ai_chat_mode", "ai_chat_channels", "logging_channels"),
        category = "Configuration",
        install_context = "Guild",
        interaction_context = "Guild",
        default_member_permissions = "MANAGE_GUILD",
        required_bot_permissions = "MANAGE_GUILD",
    )
]
pub async fn setup(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
