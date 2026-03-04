//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

use crate::common::ai;

use crate::common::database::interfaces::guild_config::GuildConfig;

use crate::common::ai::user_ai_usage::is_user_above_gpt_token_limit;

//------------------------------------------------------------//

pub async fn guild_ai_chat_handler(
    ctx: &serenity::Context,
    message: &serenity::Message,
) -> Result<(), Error> {
    // don't respond to bots, system messages, or empty messages
    if
        message.author.bot ||
        message.author.system ||
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
    let rate_limit_per_user = guild_channel.rate_limit_per_user.unwrap_or(0);
    if rate_limit_per_user == 0 {
        return Ok(());
    }

    // attempt to fetch the guild config, if it doesn't exist, ignore the message
    let Some(guild_config) = GuildConfig::fetch(guild_id.get().to_string()).await? else {
        return Ok(());
    };

    let channel_id_string = message.channel_id.get().to_string();

    let was_mentioned = message.mentions_me(&ctx).await?;

    let guild_ai_chat_mode = guild_config.get_ai_chat_mode().await;

    let should_respond = guild_ai_chat_mode.should_respond_in_channel(
        &guild_config,
        channel_id_string,
        was_mentioned,
    );

    if !should_respond {
        return Ok(());
    }

    let member = message.member(&ctx).await?; // should never fail

    let user_id = member.user.id;
    let user_id_string = user_id.get().to_string();

    if is_user_above_gpt_token_limit(user_id).await? {
        return Ok(()); // don't continue if the user is above the token limit
    }

    let me = ctx.cache.current_user().clone(); // cloned to avoid async issues

    let prompt_response = ai::gpt::prompt(
        ai::gpt::PromptOptions {
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

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    let channel = message.channel(&ctx).await?; // should never fail

    channel.id().send_message(
        ctx,
        serenity::CreateMessage::default()
        .allowed_mentions(crate::DefaultAllowedMentions::new())
        .reference_message(message)
        .content(prompt_response.content)
    ).await?;

    Ok(())
}
