//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::ai;

use crate::common::helpers::bot::create_default_allowed_mentions;

//------------------------------------------------------------//

/// Solves math problems.
#[
    poise::command(
        slash_command,
        category = "Utility",
        guild_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
    )
]
pub async fn solve(
    ctx: Context<'_>,

    #[description = "The math problem to solve"]
    problem: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    let user_id = ctx.author().id;

    if ai::user_ai_usage::is_user_above_gpt_token_limit(user_id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    let prompt_response = ai::gpt::prompt(
        ai::gpt::PromptOptions {
            user_id: user_id.to_string(),
            instructions: [
                "You can only do math. Attempt to solve the supplied input.",
                "If the input is not solvable using math, say \"unable to solve\".",
                "Be succinct in your output.",
            ].join("\n"),
            input_prompt: vec![problem.to_string()],
            ..Default::default()
        }
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(create_default_allowed_mentions())
        .content(prompt_response.content)
    ).await?;

    return Ok(());
}
