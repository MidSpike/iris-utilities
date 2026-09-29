//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity, Mentionable};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::database::interfaces::guild_config::GuildConfigAiModerationMode;
use crate::common::database::interfaces::guild_config::GuildConfigAiModerationSensitivity;
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

/// Sets the channel used for logging ai moderation events.
#[
    poise::command(
        slash_command,
        rename = "set_ai_moderation_events",
    )
]
pub async fn set_ai_moderation_events_logging_channel(
    ctx: Context<'_>,

    #[description = "A channel to log ai moderation events in."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_logging_channels = guild_config.get_logging_channels().await;

    let channel_id_generic: serenity::GenericChannelId = channel.id.into();

    let new_logging_channels = GuildConfigLoggingChannels {
        ai_moderation_events: Some(channel_id_generic),
        ..current_logging_channels
    };

    // Force disable the ai moderation feature so the guild must explicitly opt-in each time.
    guild_config.set_ai_moderation_mode(GuildConfigAiModerationMode::Disabled).await?;

    // Then set the logging channel.
    guild_config.set_logging_channels(new_logging_channels).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Logging Channels")
            .description(
                [
                    format!("Added ai moderation events logging channel {}.", channel.mention()).as_str(),
                    "",
                    "**Heads-Up:**",
                    "Ai moderation is currently disabled.",
                    "Use `/setup ai_moderation mode` to enable it.",
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Unsets the channel used for logging ai moderation events.
#[
    poise::command(
        slash_command,
        rename = "unset_ai_moderation_events",
    )
]
pub async fn unset_ai_moderation_events_logging_channel(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_logging_channels = guild_config.get_logging_channels().await;

    let new_logging_channels = GuildConfigLoggingChannels {
        ai_moderation_events: None,
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
                    "Removed ai moderation events logging channel.".to_string(),
                ].join("\n")
            )
        )
    ).await?;

    // Reset ai moderation to default values when there is not a configured alerts channel.
    // The default behavior is configured to reasonable defaults (such as being disabled).
    // This is ensures guild owners are aware of all ai moderation events as they happen.
    guild_config.set_ai_moderation_mode(GuildConfigAiModerationMode::default()).await?;
    guild_config.set_ai_moderation_sensitivity(GuildConfigAiModerationSensitivity::default()).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Moderation")
            .description(
                [
                    "Ai moderation has been reset back to the default state (disabled).",
                    "An ai moderation events logging channel is required for ai moderation.",
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
            "set_ai_moderation_events_logging_channel",
            "unset_ai_moderation_events_logging_channel",
        ),
    )
]
pub async fn logging_channels(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
