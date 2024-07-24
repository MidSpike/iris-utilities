//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::ai;

//------------------------------------------------------------//

/// Get GPT to fact check what you tell it.
#[
    poise::command(
        slash_command,
        category = "Fun",
        guild_cooldown = "1", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn fact_check(
    ctx: Context<'_>,
    #[max_length = 256]
    #[description = "The statement to fact check"] statement: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    if ai::user_ai_usage::is_user_above_gpt_token_limit(ctx.author().id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    let user_id = ctx.author().id;


    let system_message = ai::gpt::GptMessage::system(
        [
            "Be extremely unique and very concise.",
            "Fact-check what you are told.",
            "If something is not factual, correct it.",
            "If you don't know, say so.",
        ].join("\n")
    );

    let user_message = ai::gpt::GptMessage::user(statement);

    let prompt_response = ai::gpt::prompt(
        vec![system_message, user_message],
        Some(user_id.to_string()),
        None, // use default temperature
        Some(256), // max tokens
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(crate::DefaultAllowedMentions::new())
        .content(prompt_response.content)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .footer(serenity::CreateEmbedFooter::new("Fact checks powered by GPT"))
        )
    ).await?;

    return Ok(());
}
