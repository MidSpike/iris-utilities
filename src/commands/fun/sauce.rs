//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::ai;

use crate::common::branding;

use crate::common::helpers::bot::create_default_allowed_mentions;

//------------------------------------------------------------//

/// Get GPT to sus out baseless claims.
#[
    poise::command(
        slash_command,
        category = "Fun",
        guild_cooldown = "1", // in seconds
        user_cooldown = "5", // in seconds
        install_context = "Guild|User",
        interaction_context = "Guild|BotDm|PrivateChannel",
    )
]
pub async fn sauce(
    ctx: Context<'_>,
    #[max_length = 512]
    #[description = "The claim to sus out"] claim: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    if ai::user_ai_usage::is_user_above_gpt_token_limit(ctx, ctx.author().id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    let user_id = ctx.author().id;

    let prompt_response = ai::gpt::prompt(
        ai::gpt::PromptOptions {
            user_id: user_id.to_string(),
            instructions: [
                "Your job is to \"sus out baseless claims using sauces\" (aka fact-check).",
                "If something is sus, correct it with evidence.",
                "If you don't know, say so instead of guessing.",
                "Cite \"sauces\" (aka sources) if necessary.",
                "Be very concise and avoid over-explaining.",
            ].join("\n"),
            input_prompt: vec![claim],
            ..Default::default()
        }.web_search_tool(true)
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(create_default_allowed_mentions())
        .content(prompt_response.content)
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .footer(serenity::CreateEmbedFooter::new("Sauces powered by GPT"))
        )
    ).await?;

    return Ok(());
}
