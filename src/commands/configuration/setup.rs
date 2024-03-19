//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use poise::ChoiceParameter;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::moderation;

use crate::common::database::interfaces::guild_config::GuildConfig;
use crate::common::database::interfaces::guild_config::GuildConfigAiChatMode;

//------------------------------------------------------------//

async fn send_not_guild_owner(
    ctx: &Context<'_>,
) -> Result<(), Error> {
    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Guild Configuration")
            .description("You must be the owner of this guild to setup this bot.")
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

// The list of ai chat modes available publicly.
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

/// Configure ai chat mode for your guild.
#[poise::command(slash_command)]
async fn ai_chat_mode(
    ctx: Context<'_>,

    #[description = "The ai chat mode to use."]
    ai_chat_mode: AiChatMode,
) -> Result<(), Error> {
    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    // ensure the executing member is the owner of the guild
    if !moderation::is_guild_member_owner_of_guild(&ctx, &guild, &executing_member) {
        send_not_guild_owner(&ctx).await?;

        return Ok(());
    }

    let guild_config = GuildConfig::ensure(
        guild.id.to_string(),
    ).await?;

    guild_config.set_ai_chat_mode(
        ai_chat_mode.to_guild_config_value(),
    ).await?;

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Guild Configuration - Ai Chat Mode")
            .description(format!("Set ai chat mode to **{}**.", ai_chat_mode.name()))
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

/// List the ai chat channels for your guild.
#[
    poise::command(
        slash_command,
        rename = "list",
    )
]
async fn list_ai_chat_channels(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    // ensure the executing member is the owner of the guild
    if !moderation::is_guild_member_owner_of_guild(&ctx, &guild, &executing_member) {
        send_not_guild_owner(&ctx).await?;

        return Ok(());
    }

    let guild_config = GuildConfig::ensure(
        guild.id.to_string(),
    ).await?;

    let ai_chat_channels = guild_config.get_ai_chat_channels().await;

    if ai_chat_channels.is_empty() {
        ctx.send(
            poise::CreateReply::default()
            .embed(
                serenity::CreateEmbed::default()
                .color(BrandColor::new().get())
                .title("Guild Configuration - Ai Chat Channels")
                .description("Currently this guild does not have any ai chat channels.")
            )
        ).await?;

        return Ok(());
    }

    let ai_chat_channels_string =
        ai_chat_channels
        .into_iter()
        .map(|id| format!("- <#{}> ({})", id, id))
        .join("\n");

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Guild Configuration - Ai Chat Channels")
            .description(ai_chat_channels_string)
        )
    ).await?;

    Ok(())
}

/// Enable ai chat for a channel in your guild.
#[
    poise::command(
        slash_command,
        rename = "enable",
    )
]
async fn enable_ai_chat_channel(
    ctx: Context<'_>,

    #[description = "A channel to use for ai chat."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    // ensure the executing member is the owner of the guild
    if !moderation::is_guild_member_owner_of_guild(&ctx, &guild, &executing_member) {
        send_not_guild_owner(&ctx).await?;

        return Ok(());
    }

    let guild_id_string = guild.id.get().to_string();

    let channel_id_string = channel.id.get().to_string();

    let guild_config = GuildConfig::ensure(guild_id_string).await?;

    let current_ai_chat_channels = guild_config.get_ai_chat_channels().await;

    // don't add the same channel multiple times
    if !current_ai_chat_channels.contains(&channel_id_string) {
        let new_ai_chat_channels = [
            current_ai_chat_channels,
            vec![channel_id_string],
        ].concat();

        guild_config.set_ai_chat_channels(new_ai_chat_channels).await?;
    }

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Guild Configuration - Ai Chat Channels")
            .description(format!("Added <#{}> as an ai chat channel.", channel.id))
        )
    ).await?;

    Ok(())
}

/// Disable ai chat for a channel in your guild.
#[
    poise::command(
        slash_command,
        rename = "disable",
    )
]
async fn disable_ai_chat_channel(
    ctx: Context<'_>,

    #[description = "A channel to use for ai chat."]
    channel: serenity::GuildChannel,
) -> Result<(), Error> {
    let executing_member =
        ctx
        .author_member().await
        .expect("There should be a member in this context.")
        .clone();

    let guild = ctx.guild().expect("There should be a guild in this context.").clone();

    // ensure the executing member is the owner of the guild
    if !moderation::is_guild_member_owner_of_guild(&ctx, &guild, &executing_member) {
        send_not_guild_owner(&ctx).await?;

        return Ok(());
    }

    let guild_id_string = guild.id.get().to_string();

    let channel_id_string = channel.id.get().to_string();

    let guild_config = GuildConfig::ensure(guild_id_string).await?;

    let current_ai_chat_channels = guild_config.get_ai_chat_channels().await;

    // don't remove a channel that isn't already an ai chat channel
    if current_ai_chat_channels.contains(&channel_id_string) {
        let new_ai_chat_channels =
            current_ai_chat_channels
            .into_iter()
            .filter(|s| s != &channel_id_string)
            .collect::<Vec<String>>();

        guild_config.set_ai_chat_channels(new_ai_chat_channels).await?;
    }

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Guild Configuration - Ai Chat Channels")
            .description(format!("Removed <#{}> as an ai chat channel.", channel.id))
        )
    ).await?;

    Ok(())
}

/// Configure ai chat channels for your guild.
#[
    poise::command(
        slash_command,
        subcommands(
            "list_ai_chat_channels",
            "enable_ai_chat_channel",
            "disable_ai_chat_channel"
        ),
    )
]
async fn ai_chat_channels(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}

//------------------------------------------------------------//

/// Guild owners can setup this bot for their guild.
#[
    poise::command(
        slash_command,
        guild_only,
        subcommands("ai_chat_mode", "ai_chat_channels"),
        category = "Configuration",
    )
]
pub async fn setup(
    _ctx: Context<'_>,
) -> Result<(), Error> {
    Ok(())
}
