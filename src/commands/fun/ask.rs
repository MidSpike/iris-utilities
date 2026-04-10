//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::ai;

use crate::common::helpers::bot::create_default_allowed_mentions;

//------------------------------------------------------------//

/// Ask GPT a question.
#[
    poise::command(
        slash_command,
        category = "Fun",
        guild_cooldown = "1", // in seconds
        user_cooldown = "10", // in seconds
        install_context = "User",
        interaction_context = "PrivateChannel"
    )
]
pub async fn ask(
    ctx: Context<'_>,

    #[description = "The prompt to send to GPT"]
    prompt: String,

    #[description = "Can GPT search the web?"]
    web_search: Option<bool>,
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

    let prompt_response = ai::gpt::prompt(
        ai::gpt::PromptOptions {
            user_id: user_id.to_string(),
            instructions: indoc::formatdoc!(
                r#"
                    You are {app_name} (aka {bot_mention}), a discord app on Discord.
                    Converse like a normal human, use simple syntax (no em-dashes, etc),
                    keep your responses very short, and refrain from using emojis.
                "#,
                app_name = my_name,
                bot_mention = format!("<@{}>", my_id.to_string()),
            ),
            input_prompt: vec![prompt.to_string()],
            ..Default::default()
        }.web_search_tool(web_search.unwrap_or(false))
    ).await?;

    ai::user_ai_usage::increment_user_gpt_tokens(user_id, prompt_response.tokens_used).await?;

    ctx.send(
        poise::CreateReply::default()
        .allowed_mentions(create_default_allowed_mentions())
        .content(prompt_response.content)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .footer(serenity::CreateEmbedFooter::new("Response powered by GPT"))
        )
    ).await?;

    return Ok(());
}
