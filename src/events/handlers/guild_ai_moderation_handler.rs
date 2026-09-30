//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use poise::serenity_prelude::{CacheHttp, CreateEmbed, CreateEmbedFooter, CreateMessage, Mentionable};
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

// use crate::Data;

use crate::Error;

use crate::common::ai::gpt::{self, ModerationCheckResponseCategory};

use crate::common::helpers::bot::create_escaped_code_block;

use crate::common::database::interfaces::guild_config::{GuildConfig, GuildConfigAiModerationMode};

//------------------------------------------------------------//

pub async fn guild_ai_moderation_handler(
    ctx: &serenity::Context,
    message: &serenity::Message,
) -> Result<bool, Error> {
    // don't respond to bots, system messages, or empty messages
    if
        message.author.bot() ||
        message.author.system() ||
        message.content.is_empty()
    {
        return Ok(false);
    }

    // only continue if the message was sent in a guild
    let Some(guild_id) = message.guild_id else {
        return Ok(false);
    };

    let Ok(guild_channel) = message.guild_channel(&ctx).await else {
        return Ok(false);
    };

    // println!("guild_ai_moderation_handler(): [{}]: {}", message.author.name, message.content);

    // require slowmode to be enabled
    match guild_channel.base.rate_limit_per_user {
        Some(rate_limit) if rate_limit.get() > 0 => {}, // continue
        _ => return Ok(false), // ignore channels without slowmode
    }

    // attempt to fetch the guild config, if it doesn't exist, ignore the message
    let Some(guild_config) = GuildConfig::fetch(guild_id).await? else {
        return Ok(false);
    };

    let guild_ai_moderation_mode = guild_config.get_ai_moderation_mode().await;

    if !guild_ai_moderation_mode.is_enabled() {
        return Ok(false);
    }

    let guild_ai_moderation_sensitivity = guild_config.get_ai_moderation_sensitivity().await;

    // A guild is required to have a logging channel to use this feature.
    // In any situation where a channel cannot be found, return gracefully instead of proceeding.
    let guild_logging_channel = {
        let Some(logging_channel_id) = guild_config.get_logging_channels().await.ai_moderation_events else {
            return Ok(false);
        };

        let guild_channel = match ctx.http.get_channel(logging_channel_id).await {
            Ok(a_channel) => a_channel.guild(),
            Err(_) => None,
        };

        if let Some(guild_channel) = guild_channel {
            guild_channel
        } else {
            return Ok(false);
        }
    };

    // ---
    // We can now safely assume that this guild has enabled ai moderation and has logging set up.
    // ---

    // Important:
    // - Safe content is used to convert mentions to alpha-numeric content.
    // - Proxy attachment urls are used so attachments are provided directly by Discord.
    let ai_moderation_result = gpt::moderation_check(
        message.content_safe(&ctx.cache).to_string(),
        { // Attachments
            message.attachments.iter()
            .filter(|a| a.size > 20_000_000) // ~20 MB limit imposed by api
            .map(|a| a.proxy_url.to_string())
            .collect()
        }
    ).await;

    let ai_moderation_result = match ai_moderation_result {
        Err(why) => {
            eprintln!("Ai Moderation Check Failed: {}", why);

            return Ok(false);
        },

        Ok(r) => r,
    };

    if !ai_moderation_result.flagged {
        return Ok(false);
    }

    // Filter based on the guild's preferred sensitivity level.
    let filtered_categories: Vec<&ModerationCheckResponseCategory> =
        ai_moderation_result.categories.iter()
        .filter(|c| c.flagged)
        .filter(|c| guild_ai_moderation_sensitivity.should_trigger_for(c.score))
        .collect();

    if filtered_categories.is_empty() {
        return Ok(false);
    }

    // ---
    // The message was flagged, log it to the guild's configured channel.
    // ---

    let flagged_message = message; // rename for clarity

    let flagged_message_link = flagged_message.link();

    let member = flagged_message.member(&ctx).await?; // should never fail

    let embed =
        CreateEmbed::default()
        .color(0xFFFF00)
        .description(
            {
                let action_taken = match guild_ai_moderation_mode {
                    GuildConfigAiModerationMode::EnabledLoggingOnly => "Flagged",
                    GuildConfigAiModerationMode::EnabledLoggingAndRemoval => "Removed",
                    GuildConfigAiModerationMode::Disabled => panic!(), // Should be impossible
                };

                let categories = {
                    filtered_categories.iter()
                    .sorted_by(|a, b| b.score.total_cmp(&a.score))
                    .map(
                        |c| {
                            let int_score = ((c.score * 100.0).round() as i32).clamp(0, 100);

                            format!("- {}: {}%", c.label, int_score)
                        }
                    )
                    .join("\n")
                };

                let small_quote = {
                    let mut flagged_contents = flagged_message.content.to_string();
                    let flagged_length = flagged_contents.len();
                    let target_length = flagged_length.min(64);

                    // Only show ellipses when truncated.
                    let truncated_contents = if flagged_length > target_length {
                        flagged_contents.truncate(target_length);

                        format!("{}...", flagged_contents)
                    } else {
                        format!("{}", flagged_contents)
                    };

                    // Format as quoted code block
                    format!("> {}", create_escaped_code_block(None, &truncated_contents).replace("\n", ""))
                };

                [
                    format!("{} [message]({}) (`{}`)", action_taken, flagged_message_link, flagged_message.id),
                    format!("sent by {} (`{}`)", member.mention(), member.user.id.to_string()),
                    "".to_string(),
                    "Flagged Categories:".to_string(),
                    format!("{}", categories),
                    "".to_string(),
                    "Start of message:".to_string(),
                    format!("{}", small_quote),
                ].join("\n")
            }
        )
        .footer(CreateEmbedFooter::new("Ai moderation powered by GPT"));

    let logging_message = CreateMessage::default().embed(embed);

    guild_logging_channel.send_message(ctx.http(), logging_message).await?;

    // ---
    // If automatic moderation is enabled, delete the flagged message.
    // ---

    if guild_ai_moderation_mode.is_auto_moderation_enabled() {
        let _ = flagged_message.delete(ctx.http(), Some("Flagged by Ai Moderation")).await;
    }

    Ok(true) // content was flagged
}
