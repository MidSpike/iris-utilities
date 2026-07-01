//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use poise::ChoiceParameter;
use poise::serenity_prelude::{self as serenity, Mentionable};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::database::interfaces::guild_config::GuildConfig;
use crate::common::database::interfaces::guild_config::GuildConfigAiChatMode;

//------------------------------------------------------------//

// The list of ai chat modes available publicly.
// Note: Keep separate from `GuildConfigAiChatMode`.
#[derive(poise::ChoiceParameter)]
enum AiChatMode {
    #[name = "Disabled"]
    Disabled,

    #[name = "When mentioned in ai chat channels"]
    AiChatChannelsRequireMention,

    #[name = "Always in ai chat channels and when mentioned anywhere"]
    AiChatChannelsAlwaysRespond,
}

impl AiChatMode {
    pub fn to_guild_config_value(
        &self,
    ) -> GuildConfigAiChatMode {
        match self {
            AiChatMode::Disabled =>
                GuildConfigAiChatMode::Disabled,

            AiChatMode::AiChatChannelsRequireMention =>
                GuildConfigAiChatMode::AiChatChannelsRequireMention,

            AiChatMode::AiChatChannelsAlwaysRespond =>
                GuildConfigAiChatMode::AiChatChannelsAlwaysRespond,
        }
    }
}

//------------------------------------------------------------//

/// Configure the ai chat mode for this guild.
#[poise::command(slash_command)]
async fn ai_chat_mode(
    ctx: Context<'_>,

    #[description = "Control how ai chat works in this guild."]
    ai_chat_mode: AiChatMode,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    guild_config.set_ai_chat_mode(
        ai_chat_mode.to_guild_config_value(),
    ).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Chat Mode")
            .description(format!("Set ai chat mode to **{}**.", ai_chat_mode.name()))
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

/// Information about what ai chat channels are.
#[
    poise::command(
        slash_command,
        rename = "info",
    )
]
async fn info_ai_chat_channels(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let _guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Chat Channels")
            .description(
                indoc::formatdoc!(
                    r#"
                        Using 3rd-party large language models, I can respond to messages in
                        specific channels, or when (enabled and) mentioned in any channel.
                        This is useful for creating interactive experiences for guild members.

                        I will only reply in configured channels with slowmode enabled!

                        **Ai Chat Modes**
                        - Disabled:
                          I will not reply to messages in ai chat channels.
                        - When mentioned in ai chat channels:
                          I will only reply to messages in ai chat channels when mentioned.
                        - Always in ai chat channels or when mentioned anywhere:
                          I will always reply to messages in ai chat channels and when mentioned.
                    "#,
                )
            )
        )
    ).await?;

    Ok(())
}

/// Lists the ai chat channels in this guild.
#[
    poise::command(
        slash_command,
        rename = "list",
    )
]
async fn list_ai_chat_channels(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let ai_chat_channels = guild_config.get_ai_chat_channels().await;

    if ai_chat_channels.is_empty() {
        ctx.send(
            poise::CreateReply::default()
            .embed(
                serenity::CreateEmbed::default()
                .color(branding::color::PRIMARY)
                .title("Guild Configuration - Ai Chat Channels")
                .description("Ai chat is not enabled for any channels.")
            )
        ).await?;

        return Ok(());
    }

    let ai_chat_channels_string =
        ai_chat_channels
        .into_iter()
        .map(|id| format!("- {} ({})", id.mention(), id.to_string()))
        .join("\n");

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Chat Channels")
            .description(ai_chat_channels_string)
        )
    ).await?;

    Ok(())
}

/// Allows ai chat features for a channel in this guild.
#[
    poise::command(
        slash_command,
        rename = "allow",
    )
]
async fn allow_ai_chat_channel(
    ctx: Context<'_>,

    #[description = "A channel to allow ai chat in."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let guild_id = ctx.guild_id().expect("There should be a guild in this context.");

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let current_ai_chat_channels = guild_config.get_ai_chat_channels().await;

    let channel_id_generic: serenity::GenericChannelId = channel.id.into();

    // don't add the same channel multiple times
    if !current_ai_chat_channels.contains(&channel_id_generic) {
        let new_ai_chat_channels = [
            current_ai_chat_channels,
            vec![channel_id_generic],
        ].concat();

        guild_config.set_ai_chat_channels(new_ai_chat_channels).await?;
    }

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Chat Channels")
            .description(
                [
                    format!("Allowed ai chat features for {}.", channel.mention()).as_str(),
                    "",
                    "**Pro-Tip:**",
                    "Make sure slowmode is enabled for that channel.",
                    "This won't work correctly if slowmode is disabled.",
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Disallows ai chat features for a channel in this guild.
#[
    poise::command(
        slash_command,
        rename = "disallow",
    )
]
async fn disallow_ai_chat_channel(
    ctx: Context<'_>,

    #[description = "A channel to disallow ai chat in."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    let guild_config = GuildConfig::ensure(guild.id).await?;

    let current_ai_chat_channels = guild_config.get_ai_chat_channels().await;

    let channel_id_generic: serenity::GenericChannelId = channel.id.into();

    // don't remove a channel that isn't already an ai chat channel
    if current_ai_chat_channels.contains(&channel_id_generic) {
        let new_ai_chat_channels =
            current_ai_chat_channels
            .into_iter()
            .filter(|s| s != &channel_id_generic)
            .collect::<Vec<serenity::GenericChannelId>>();

        guild_config.set_ai_chat_channels(new_ai_chat_channels).await?;
    }

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title("Guild Configuration - Ai Chat Channels")
            .description(
                [
                    format!("Disallowed ai chat features for {}.", channel.mention()).as_str(),
                    "",
                    "**Pro-Tip:**",
                    "By default, channels do not have ai chat features.",
                    "Only run this command for previously allowed channels.",
                ].join("\n")
            )
        )
    ).await?;

    Ok(())
}

/// Configure ai chat channels for your guild.
#[
    poise::command(
        slash_command,
        subcommands(
            "info_ai_chat_channels",
            "list_ai_chat_channels",
            "allow_ai_chat_channel",
            "disallow_ai_chat_channel"
        ),
    )
]
async fn ai_chat_channels(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}

//------------------------------------------------------------//

/// Configure this guild's preferences and settings.
#[
    poise::command(
        slash_command,
        guild_only,
        subcommands("ai_chat_mode", "ai_chat_channels"),
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
