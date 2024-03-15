//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use rand::seq::SliceRandom;

use poise::serenity_prelude::{self as serenity};

use serenity::Mentionable;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::ai;

//------------------------------------------------------------//

/// Roasts another user.
#[
    poise::command(
        slash_command,
        category = "Fun",
        user_cooldown = "3", // in seconds
    )
]
pub async fn roast(
    ctx: Context<'_>,
    #[description = "The user to roast."] target_user: serenity::User,
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
        "Be extremely unique, very concise, and use the mention. Roast {user_mention}";

    let system_prompts = vec![
        prompt_prefix.to_string(),
        format!("{} in a uniquely themed way.", prompt_prefix),
        format!("{} in a programmer themed way.", prompt_prefix),
        format!("{} in a rust language themed way.", prompt_prefix),
        format!("{} in a robotic themed way.", prompt_prefix),
        format!("{} in a cowboy themed way.", prompt_prefix),
        format!("{} in a pirate themed way.", prompt_prefix),
        format!("{} in a medieval themed way.", prompt_prefix),
        format!("{} in a fantasy themed way.", prompt_prefix),
        format!("{} in a sci-fi themed way.", prompt_prefix),
        format!("{} in a Star Wars themed way.", prompt_prefix),
        format!("{} in a Doctor Who themed way.", prompt_prefix),
        format!("{} in a Harry Potter themed way.", prompt_prefix),
        format!("{} in a Lord of the Rings themed way.", prompt_prefix),
        format!("{} in a Game of Thrones themed way.", prompt_prefix),
        format!("{} in a Pirates of the Caribbean themed way.", prompt_prefix),
        format!("{} in a Helluva Boss themed way.", prompt_prefix),
    ];

    let random_system_prompt =
        system_prompts
        .choose(&mut rand::thread_rng())
        .expect("System prompts vector is empty")
        .replace("{user_mention}", &target_user.mention().to_string());

    let system_message = ai::gpt::GptMessage::system(random_system_prompt);

    let prompt_response = ai::gpt::prompt(
        vec![system_message],
        Some(gpt_user_id), // ironic that we are still providing a user id
        None, // use default temperature
        Some(128), // max tokens
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(crate::DefaultAllowedMentions::new())
        .content(prompt_response.content)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .footer(serenity::CreateEmbedFooter::new("Roasts powered by GPT"))
        )
    ).await?;

    Ok(())
}
