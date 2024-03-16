//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

use crate::common::ai;

use crate::common::database::interfaces::guild_config::GuildConfig;

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

    if ai::user_ai_usage::is_user_above_gpt_token_limit(user_id).await? {
        return Ok(()); // don't continue if the user is above the token limit
    }

    let me = ctx.cache.current_user().clone(); // cloned to avoid async issues

    let system_message = ai::gpt::GptMessage::system(
        [
            format!(
                "You are {} (aka ${}), a discord bot on Discord.",
                me.name,
                me.mention()
            ).as_str(),
            "Converse like a human,",
            "pretend to not be an ai,",
            "keep your responses very short,",
            "and refrain from using emojis.",
        ].join("\n"),
    );

    let user_message = ai::gpt::GptMessage::user(
        message.content.chars().take(128).collect::<String>(),
    );

    let prompt_response = ai::gpt::prompt(
        vec![system_message, user_message],
        Some(user_id_string),
        None, // use default temperature
        Some(128), // max tokens
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
