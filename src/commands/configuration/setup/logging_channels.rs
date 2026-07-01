//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity, Mentionable};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::database::interfaces::guild_config::{GuildConfig, GuildConfigLoggingChannels};

//------------------------------------------------------------//

/// Sets the channel used for logging member joins.
#[
    poise::command(
        slash_command,
        rename = "set_member_joins",
    )
]
pub async fn set_member_joins_logging_channel(
    ctx: Context<'_>,

    #[description = "A channel to log member joins in."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_logging_channels = guild_config.get_logging_channels().await;

    let channel_id_generic: serenity::GenericChannelId = channel.id.into();

    let new_logging_channels = GuildConfigLoggingChannels {
        guild_member_join: Some(channel_id_generic),
        ..current_logging_channels
    };

    guild_config.set_logging_channels(new_logging_channels).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Logging Channels")
            .description(
                [
                    format!("Added guild member joins logging channel {}.", channel.mention()).as_str(),
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Unsets the channel used for logging member joins.
#[
    poise::command(
        slash_command,
        rename = "unset_member_joins",
    )
]
pub async fn unset_member_joins_logging_channel(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_logging_channels = guild_config.get_logging_channels().await;

    let new_logging_channels = GuildConfigLoggingChannels {
        guild_member_join: None,
        ..current_logging_channels
    };

    guild_config.set_logging_channels(new_logging_channels).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Logging Channels")
            .description(
                [
                    "Removed guild member joins logging channel.".to_string(),
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

/// Sets the channel used for logging member leaves.
#[
    poise::command(
        slash_command,
        rename = "set_member_leaves",
    )
]
pub async fn set_member_leaves_logging_channel(
    ctx: Context<'_>,

    #[description = "A channel to log member leaves in."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_logging_channels = guild_config.get_logging_channels().await;

    let channel_id_generic: serenity::GenericChannelId = channel.id.into();

    let new_logging_channels = GuildConfigLoggingChannels {
        guild_member_leave: Some(channel_id_generic),
        ..current_logging_channels
    };

    guild_config.set_logging_channels(new_logging_channels).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Logging Channels")
            .description(
                [
                    format!("Added guild member leaves logging channel {}.", channel.mention()).as_str(),
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Unsets the channel used for logging member leaves.
#[
    poise::command(
        slash_command,
        rename = "unset_member_leaves",
    )
]
pub async fn unset_member_leaves_logging_channel(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_logging_channels = guild_config.get_logging_channels().await;

    let new_logging_channels = GuildConfigLoggingChannels {
        guild_member_leave: None,
        ..current_logging_channels
    };

    guild_config.set_logging_channels(new_logging_channels).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Logging Channels")
            .description(
                [
                    "Removed guild member leaves logging channel.".to_string(),
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

/// Configure logging channels for your guild.
#[
    poise::command(
        slash_command,
        subcommands(
            "set_member_joins_logging_channel",
            "unset_member_joins_logging_channel",
            "set_member_leaves_logging_channel",
            "unset_member_leaves_logging_channel",
        ),
    )
]
pub async fn logging_channels(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
