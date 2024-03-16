//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::ai;

//------------------------------------------------------------//

/// Solves math problems.
#[
    poise::command(
        slash_command,
        category = "Utility",
    )
]
pub async fn solve(
    ctx: Context<'_>,
    #[description = "The math problem to solve"] problem: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    let user_id = ctx.author().id;

    if ai::user_ai_usage::is_user_above_gpt_token_limit(user_id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    let system_message = ai::gpt::GptMessage::system(
        [
            "You can only do math. Attempt to solve the supplied input.",
            "If the input is not solvable using math, say \"unable to solve\".",
            "Be succinct in your output.",
        ].join("\n")
    );

    let user_message = ai::gpt::GptMessage::user(problem);

    let prompt_response = ai::gpt::prompt(
        vec![system_message, user_message],
        Some(user_id.to_string()),
        None, // use default temperature
        Some(128), // max tokens
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(crate::DefaultAllowedMentions::new())
        .content(prompt_response.content)
    ).await?;

    return Ok(());
}
