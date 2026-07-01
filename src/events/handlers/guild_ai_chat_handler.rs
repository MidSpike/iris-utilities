//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{CacheHttp, GenericChannelId, Mentionable};
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

// use crate::Data;

use crate::Error;

use crate::common::ai::{gpt, user_ai_usage};

use crate::common::database::interfaces::guild_config::GuildConfig;

use crate::common::helpers::bot::create_default_allowed_mentions;

//------------------------------------------------------------//

pub async fn guild_ai_chat_handler(
    ctx: &serenity::Context,
    message: &serenity::Message,
) -> Result<(), Error> {
    // don't respond to bots, system messages, or empty messages
    if
        message.author.bot() ||
        message.author.system() ||
        message.content.is_empty()
    {
        return Ok(());
    }

    // only listen to messages in guilds
    let Some(guild_id) = message.guild_id else {
        return Ok(());
    };

    // println!("guild_ai_chat_handler(): [{}]: {}", message.author.name, message.content);

    let guild_channel =
        message.channel(&ctx).await?
        .guild().expect("guild channel should be present");

    // only listen to channels with slowmode enabled (to prevent spam)
    match guild_channel.base.rate_limit_per_user {
        Some(rate_limit) if rate_limit.get() > 0 => {}, // continue
        _ => return Ok(()), // ignore channels without slowmode
    }

    // attempt to fetch the guild config, if it doesn't exist, ignore the message
    let Some(guild_config) = GuildConfig::fetch(guild_id).await? else {
        return Ok(());
    };

    let was_mentioned = message.mentions_me(&ctx).await?;

    let guild_ai_chat_mode = guild_config.get_ai_chat_mode().await;

    let should_respond = guild_ai_chat_mode.should_respond_in_channel(
        &guild_config,
        message.channel_id,
        was_mentioned,
    );

    if !should_respond {
        return Ok(());
    }

    let member = message.member(&ctx).await?; // should never fail

    let user_id = member.user.id;
    let user_id_string = user_id.get().to_string();

    if user_ai_usage::is_user_above_gpt_token_limit(&ctx, user_id).await? {
        return Ok(()); // don't continue if the user is above the token limit
    }

    // ---
    // We can now safely assume that we should respond to the message.
    // ---

    let typing_indicator = GenericChannelId::from(guild_channel.id).start_typing(ctx.http.clone());

    let me = ctx.cache.current_user().clone(); // cloned to avoid async issues

    let prompt_response = gpt::prompt(
        gpt::PromptOptions {
            user_id: user_id_string,
            instructions: [
                format!(
                    "You are {} (aka {}), a discord bot on Discord.",
                    me.name,
                    me.mention()
                ).as_str(),
                "Converse like a human,",
                "pretend to not be an ai,",
                "keep your responses very short,",
                "and refrain from using emojis.",
            ].join("\n"),
            input_prompt: vec![
                message.content.chars().take(256).collect::<String>(),
            ],
            ..Default::default()
        }
    ).await?;

    user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    typing_indicator.stop();

    guild_channel.send_message(
        &ctx.http(),
        serenity::CreateMessage::default()
        .allowed_mentions(create_default_allowed_mentions())
        .reference_message(message)
        .content(prompt_response.content)
    ).await?;

    Ok(())
}
