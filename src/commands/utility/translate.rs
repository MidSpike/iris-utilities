//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serenity::Mentionable;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::libre_translate;

//------------------------------------------------------------//

const MAX_FIELD_LENGTH: usize = 1024;

//------------------------------------------------------------//

async fn autocomplete_language_code<'a>(
    ctx: Context<'_>,
    partial: &'a str,
    append_autocomplete: bool,
) -> impl Iterator<Item = serenity::AutocompleteChoice> {
    let lowercase_user_input = partial.to_lowercase();

    let supported_languages =
        ctx
        .data()
        .libre_translate_supported_languages
        .iter()
        // Remove the autocomplete option if `append_autocomplete` is false
        .filter(|language| append_autocomplete || (language.code != "auto"))
        .collect::<Vec<&libre_translate::LibreTranslateLanguage>>();

    let mut choices = Vec::new();

    for language in supported_languages {
        let starts_with_lang_code =
            language.code.to_lowercase().starts_with(&lowercase_user_input);

        let starts_with_lang_name =
            language.name.to_lowercase().starts_with(&lowercase_user_input);

        if starts_with_lang_code || starts_with_lang_name {
            choices.push(
                serenity::AutocompleteChoice::new(
                    &language.name,
                    serde_json::Value::String(
                        language.code.clone()
                    )
                )
            );
        }
    }

    choices.into_iter()
}

async fn autocomplete_language_code_to<'a>(
    ctx: Context<'_>,
    partial: &'a str,
) -> impl Iterator<Item = serenity::AutocompleteChoice> {
    autocomplete_language_code(ctx, partial, false).await
}

async fn autocomplete_language_code_from<'a>(
    ctx: Context<'_>,
    partial: &'a str,
) -> impl Iterator<Item = serenity::AutocompleteChoice> {
    autocomplete_language_code(ctx, partial, true).await
}

//------------------------------------------------------------//

/// Translate text between languages.
#[
    poise::command(
        context_menu_command = "Translate",
        category = "Context Commands",
        user_cooldown = "3", // in seconds
    )
]
pub async fn translate_message_context_menu(
    ctx: Context<'_>,

    #[description = "Message to translate"]
    message: serenity::Message,
) -> Result<(), Error> {
    let from_input_field_id = String::from("from_language");
    let to_input_field_id = String::from("to_language");

    let auto_detect_lang_label =
        ctx
        .data()
        .libre_translate_supported_languages
        .iter()
        .find(|language| language.code == "auto")
        .map(|language| language.name.clone())
        .expect("auto language code not found");

    let modal_response = ctx.interaction.quick_modal(
        ctx.serenity_context(),
        serenity::CreateQuickModal::new("Translate")
        .timeout(std::time::Duration::from_secs(120))
        .field(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                "From Language",
                &from_input_field_id,
            )
            .placeholder("auto | en | de | fr | etc")
            .value(auto_detect_lang_label)
            .min_length(1)
            .max_length(64)
            .required(true)
        )
        .field(
            serenity::CreateInputText::new(
                serenity::InputTextStyle::Short,
                "To Language",
                &to_input_field_id,
            )
            .placeholder("en | de | fr | etc")
            .value("English")
            .min_length(1)
            .max_length(64)
            .required(true)
        )
    ).await?;

    let Some(modal_response) = modal_response else {
        return Ok(());
    };

    modal_response.interaction.defer_ephemeral(ctx).await?;

    let text = message.content.clone();
    let from = modal_response.inputs.get(0).expect("unable to get from language").clone();
    let to = modal_response.inputs.get(1).expect("unable to get to language").clone();

    // ensure that the input message is not from a bot
    // we should pretend that we never received the message
    // as interacting with other bots could lead to abuse
    if
        message.author.bot ||
        message.author.system
    {
        return Ok(());
    }

    // next we need to check that the input is not empty
    // we should also just ignore the message if it is empty
    // as there is no point in translating an empty message
    if text.trim().is_empty() {
        return Ok(());
    }

    let translated_text = match libre_translate::translate(&text, &from, &to).await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("{}", e);

            ctx.send(
                poise::CreateReply::default()
                .content("An error occurred while translating.")
            ).await?;

            return Ok(());
        },
    };

    // limit field lengths to abide by discord's embed limits
    let text: String = text.chars().take(MAX_FIELD_LENGTH).collect();
    let translated_text: String = translated_text.chars().take(MAX_FIELD_LENGTH).collect();

    modal_response.interaction.edit_response(
        ctx,
        serenity::EditInteractionResponse::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Translation")
            .description(format!("{}, here is the translation.", ctx.author().mention()))
            .field("From", format!("```\n{}\n```", text), false)
            .field("To", format!("```\n{}\n```", translated_text), false)
            .footer(
                serenity::CreateEmbedFooter::new("Translated using Libre Translate")
            )
        )
    ).await?;

    Ok(())
}

//------------------------------------------------------------//

/// Translate text between languages.
#[
    poise::command(
        slash_command,
        category = "Utility",
        user_cooldown = "3", // in seconds
    )
]
pub async fn translate(
    ctx: Context<'_>,

    #[description = "The text to translate"]
    text: String,

    #[min_length = 2]
    #[max_length = 32]
    #[autocomplete = "autocomplete_language_code_to"]
    #[description = "The language to translate to"]
    to: Option<String>,

    #[min_length = 2]
    #[max_length = 32]
    #[autocomplete = "autocomplete_language_code_from"]
    #[description = "The language to translate from"]
    from: Option<String>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let to = to.unwrap_or(String::from("en"));
    let from = from.unwrap_or(String::from("auto"));

    let translated_text = match libre_translate::translate(&text, &from, &to).await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("{}", e);

            ctx.say("An error occurred while translating.").await?;

            return Ok(());
        },
    };

    // limit field lengths to abide by discord's embed limits
    let text: String = text.chars().take(MAX_FIELD_LENGTH).collect();
    let translated_text: String = translated_text.chars().take(MAX_FIELD_LENGTH).collect();

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Translation")
            .description(format!("{}, here is the translation.", ctx.author().mention()))
            .field("From", format!("```\n{}\n```", text), false)
            .field("To", format!("```\n{}\n```", translated_text), false)
            .footer(
                serenity::CreateEmbedFooter::new("Translated using Libre Translate")
            )
        )
    ).await?;

    Ok(())
}
