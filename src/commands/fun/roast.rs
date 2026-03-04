//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use rand::seq::IndexedRandom;

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
        guild_cooldown = "1", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn roast(
    ctx: Context<'_>,

    #[description = "Who's getting roasted?"]
    target: serenity::User,
) -> Result<(), Error> {
    let target_user = target; // rename for clarity

    ctx.defer().await?;

    if ai::user_ai_usage::is_user_above_gpt_token_limit(ctx.author().id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    let user_id = ctx.author().id;
    let user_id_string = user_id.to_string();

    let gpt_safety_namespace =
        std::env::var("OPENAI_API_SAFETY_NAMESPACE")
        .expect("Environment variable OPENAI_API_SAFETY_NAMESPACE not set");

    // Distinguish known prompts from unknown prompts.
    // Append the user id to the default user id.
    let gpt_user_id = format!("{}-{}", gpt_safety_namespace, user_id_string);

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
        .choose(&mut rand::rng())
        .expect("System prompts vector is empty")
        .replace("{user_mention}", &target_user.mention().to_string());

    let prompt_response = ai::gpt::prompt(
        ai::gpt::PromptOptions {
            user_id: gpt_user_id,
            instructions: random_system_prompt,
            input_prompt: vec!["Roast me".to_string()],
            ..Default::default()
        }
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
