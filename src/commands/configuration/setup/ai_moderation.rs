//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::ChoiceParameter;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::database::interfaces::guild_config::{GuildConfig, GuildConfigAiModerationSensitivity};
use crate::common::database::interfaces::guild_config::GuildConfigAiModerationMode;

//------------------------------------------------------------//

// The list of ai moderation modes available publicly.
// Note: Keep separate from `GuildConfigAiModerationMode`.
#[derive(poise::ChoiceParameter)]
enum AiModerationMode {
    #[name = "Disabled"]
    Disabled,

    #[name = "Enabled (logging only)"]
    EnabledLoggingOnly,

    #[name = "Enabled (logging and removal)"]
    EnabledLoggingAndRemoval,
}

impl AiModerationMode {
    pub fn to_guild_config_value(
        &self,
    ) -> GuildConfigAiModerationMode {
        match self {
            AiModerationMode::Disabled =>
                GuildConfigAiModerationMode::Disabled,

            AiModerationMode::EnabledLoggingOnly =>
                GuildConfigAiModerationMode::EnabledLoggingOnly,

            AiModerationMode::EnabledLoggingAndRemoval =>
                GuildConfigAiModerationMode::EnabledLoggingAndRemoval,
        }
    }
}

//------------------------------------------------------------//

// The list of ai moderation sensitivities available publicly.
// Note: Keep separate from `GuildConfigAiModerationSensitivity`.
#[derive(poise::ChoiceParameter)]
enum AiModerationSensitivity {
    #[name = "Iris (default, lowest sensitivity)"]
    Iris,

    #[name = "Rick (low sensitivity)"]
    Rick,

    #[name = "Ivan (medium sensitivity)"]
    Ivan,

    #[name = "Soul (high sensitivity)"]
    Soul,
}

impl AiModerationSensitivity {
    pub fn to_guild_config_value(
        &self,
    ) -> GuildConfigAiModerationSensitivity {
        match self {
            AiModerationSensitivity::Iris =>
                GuildConfigAiModerationSensitivity::Iris,

            AiModerationSensitivity::Rick =>
                GuildConfigAiModerationSensitivity::Rick,

            AiModerationSensitivity::Ivan =>
                GuildConfigAiModerationSensitivity::Ivan,

            AiModerationSensitivity::Soul =>
                GuildConfigAiModerationSensitivity::Soul,
        }
    }
}

//------------------------------------------------------------//

/// Information about ai moderation.
#[
    poise::command(
        slash_command,
        rename = "info",
    )
]
pub async fn info_ai_moderation(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let _guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Moderation")
            .description(
                indoc::formatdoc!(
                    r#"
                        Using 3rd-party large-language-model providers, I can analyze messages in
                        this guild, and when enabled, automatically remove inappropriate content.
                        This is useful for maintaining an appropriate experience for guild members.

                        Ai Moderation is a useful tool, but it is not perfect.
                        Slowmode is required for ai moderation to function.

                        **Ai Moderation Modes**
                        - Disabled:
                          Messages are not analyzed.
                          This is the default configuration.
                        - Enabled (logging only):
                          Messages are analyzed for inappropriate content.
                          Flagged messages are logged to the ai moderation events channel.
                        - Enabled (logging and removal):
                          Messages are analyzed for inappropriate content.
                          Flagged messages are logged to the ai moderation events channel.
                          Also, flagged messages are removed from the origin channel.

                        Scanned message contents include all text and attachments.

                        **Ai Moderation Sensitivities:**
                        - Iris (very-low):
                          Been through the trenches, mostly unbothered,
                          best for small and tight-knit communities.
                          This is the default configuration.
                        - Rick (low):
                          Can handle a little trouble without making a fuss,
                          best for growing and close communities.
                        - Ivan (medium):
                          Keeps a closer eye on inappropriate content,
                          best for formal or large communities
                        - Soul (high):
                          Severely bothered by inappropriate content,
                          best for professional or large communities.
                    "#,
                )
            )
        )
    ).await?;

    Ok(())
}

/// Sets the ai moderation mode for this guild.
#[
    poise::command(
        slash_command,
        rename = "mode",
    )
]
pub async fn mode_ai_moderation(
    ctx: Context<'_>,

    #[description = "The ai moderation mode to use for this guild."]
    ai_moderation_mode: AiModerationMode,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let logging_channels = guild_config.get_logging_channels().await;

    let ai_moderation_events_logging_channel = logging_channels.ai_moderation_events;

    if let None = ai_moderation_events_logging_channel {
        ctx.send(
            poise::CreateReply::default()
            .embed(
                serenity::CreateEmbed::default()
                .color(branding::color::PRIMARY)
                .title("Guild Configuration - Ai Moderation")
                .description(
                    [
                        "You must set a logging channel for ai moderation events before enabling ai moderation.",
                        "",
                        "Use `/setup logging_channels set_ai_moderation_events` to set a logging channel.",
                    ].join("\n")
                )
            )
        ).await?;

        return Ok(());
    }

    guild_config.set_ai_moderation_mode(
        ai_moderation_mode.to_guild_config_value(),
    ).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Moderation Mode")
            .description(
                [
                    format!("Ai moderation mode set to **{}**.", ai_moderation_mode.name()).as_str(),
                    "",
                    "**Pro-Tip:**",
                    "Ai Moderation is a useful tool, but it is not perfect.",
                    "Slowmode is required for ai moderation to function.",
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Sets the ai moderation sensitivity for this guild.
#[
    poise::command(
        slash_command,
        rename = "sensitivity",
    )
]
pub async fn sensitivity_ai_moderation(
    ctx: Context<'_>,

    #[description = "The ai moderation sensitivity to use for this guild."]
    ai_moderation_sensitivity: AiModerationSensitivity,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    guild_config.set_ai_moderation_sensitivity(
        ai_moderation_sensitivity.to_guild_config_value(),
    ).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Moderation Sensitivity")
            .description(
                [
                    format!("Ai moderation sensitivity set to **{}**.", ai_moderation_sensitivity.name()).as_str(),
                    "",
                    "**Pro-Tip:**",
                    "Ai Moderation is a useful tool, but it is not perfect.",
                    "Slowmode is required for ai moderation to function.",
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Disables ai moderation for this guild.
#[
    poise::command(
        slash_command,
        rename = "disable",
    )
]
pub async fn disable_ai_moderation(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let guild_config = GuildConfig::ensure(guild.id).await?;

    guild_config.set_ai_moderation_mode(AiModerationMode::Disabled.to_guild_config_value()).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Moderation")
            .description(
                [
                    "Disabled ai moderation for this guild.",
                    "",
                    "**Pro-Tip:**",
                    "By default, ai moderation is disabled.",
                    "Messages are not analyzed unless explicitly enabled.",
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Configure ai moderation settings for your guild.
#[
    poise::command(
        slash_command,
        subcommands(
            "info_ai_moderation",
            "mode_ai_moderation",
            "sensitivity_ai_moderation",
            "disable_ai_moderation"
        ),
    )
]
pub async fn ai_moderation(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
