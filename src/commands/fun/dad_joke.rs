//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use regex::Regex;

use rand::seq::IndexedRandom;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::ai;

//------------------------------------------------------------//

/// Tells you a dad joke.
#[
    poise::command(
        slash_command,
        category = "Fun",
        guild_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
    )
]
pub async fn dad_joke(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    if ai::user_ai_usage::is_user_above_gpt_token_limit(ctx.author().id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    let user_id = ctx.author().id;
    let user_id_string = user_id.to_string();

    let gpt_default_user_id =
        std::env::var("OPEN_AI_GPT_DEFAULT_USER_ID")
        .expect("Environment variable OPEN_AI_GPT_DEFAULT_USER_ID not set");

    // Distinguish known prompts from unknown prompts.
    // Append the user id to the default user id.
    let gpt_user_id = format!("{}-{}", gpt_default_user_id, user_id_string);

    let prompt_prefix =
        "Be extremely unique and very concise. Tell me a";

    let system_prompts = vec![
        format!("{} dad joke.", prompt_prefix),
        format!("{} random dad joke.", prompt_prefix),
        format!("{} programmer themed dad joke.", prompt_prefix),
        format!("{} rust language themed dad joke.", prompt_prefix),
        format!("{} robotic themed dad joke.", prompt_prefix),
        format!("{} cowboy themed dad joke.", prompt_prefix),
        format!("{} pirate themed dad joke.", prompt_prefix),
        format!("{} medieval themed dad joke.", prompt_prefix),
        format!("{} fantasy themed dad joke.", prompt_prefix),
        format!("{} sci-fi themed dad joke.", prompt_prefix),
        format!("{} Star Wars themed dad joke.", prompt_prefix),
        format!("{} Doctor Who themed dad joke.", prompt_prefix),
        format!("{} Harry Potter themed dad joke.", prompt_prefix),
        format!("{} Lord of the Rings themed dad joke.", prompt_prefix),
        format!("{} Game of Thrones themed dad joke.", prompt_prefix),
        format!("{} Pirates of the Caribbean themed dad joke.", prompt_prefix),
        format!("{} Helluva Boss themed dad joke.", prompt_prefix),
    ];

    let random_system_prompt =
        system_prompts
        .choose(&mut rand::rng())
        .expect("System prompts vector is empty")
        .to_string();

    let system_message = ai::gpt::GptMessage::system(random_system_prompt);

    let prompt_response = ai::gpt::prompt(
        vec![system_message],
        Some(gpt_user_id), // ironic that we are still providing a user id
        None, // use default temperature
        Some(128), // max tokens
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    // Replace repetitive new lines with a singular new line.
    let new_line_sequence = Regex::new(r"\n+")?;
    let prompt_response_content = new_line_sequence.replace_all(&prompt_response.content, "\n");

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(crate::DefaultAllowedMentions::new())
        .content(prompt_response_content)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .footer(serenity::CreateEmbedFooter::new("Dad jokes powered by GPT"))
        )
    ).await?;

    return Ok(());
}
