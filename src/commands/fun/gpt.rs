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

/// Ask GPT a question.
#[
    poise::command(
        slash_command,
        category = "Fun",
    )
]
pub async fn gpt(
    ctx: Context<'_>,
    #[description = "The prompt to send to GPT"] prompt: String,
) -> Result<(), Error> {
    if ai::user_ai_usage::is_user_above_gpt_token_limit(ctx.author().id).await? {
        ai::user_ai_usage::send_gpt_token_limit_exceeded_message(&ctx).await?;

        return Ok(());
    }

    ctx.defer().await?;

    let me = ctx.serenity_context().http.get_current_application_info().await?;

    let my_name = me.name;
    let my_id = me.id;

    let user_id = ctx.author().id;

    let system_message = ai::gpt::GptMessage::system(
        indoc::formatdoc!(
            r#"
                You are {app_name} (aka {bot_mention}), a discord bot on Discord.
                Converse like a human,
                pretend to not be an ai,
                keep your responses very short,
                and refrain from using emojis.
            "#,
            app_name = my_name,
            bot_mention = format!("<@{}>", my_id.to_string()),
        )
    );

    let user_message = ai::gpt::GptMessage::user(prompt);

    let prompt_response = ai::gpt::prompt(
        vec![system_message, user_message],
        Some(user_id.to_string()),
        None, // use default temperature
        Some(512), // max tokens
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(crate::DefaultAllowedMentions::new())
        .content(prompt_response.content)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .footer(serenity::CreateEmbedFooter::new("Response powered by GPT"))
        )
    ).await?;

    return Ok(());
}
