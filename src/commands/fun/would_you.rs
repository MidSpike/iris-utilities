//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::Mentionable;
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::chromium_oxide::{escape_html, html_to_png};

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug)]
struct Dilemma {
    link: String,
    upside: String,
    downside: String,
    yes: u32,
    no: u32,
}

//------------------------------------------------------------//

async fn fetch_random_dilemma() -> Result<Dilemma, Error> {
    let reqwest_client = reqwest::Client::new();

    let response =
        reqwest_client
        .get("https://v4.willyoupressthebutton.com/api/dilemma/random")
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await?;

    let response_status_code = response.status();

    if response_status_code != 200 {
        return Err(format!("Dilemma Api returned status code {}", response_status_code).into());
    }

    let response_json: Dilemma = response.json().await?;

    Ok(response_json)
}

//------------------------------------------------------------//

fn generate_dilemma_html(
    dilemma: &Dilemma,
) -> String {
    include_str!("../../extras/html/pages/dilemmas.html")
    .replace("{dilemma_id}", &escape_html(dilemma.link.clone()))
    .replace("{dilemma_situation}", &escape_html(dilemma.upside.clone()))
    .replace("{dilemma_exception}", &escape_html(dilemma.downside.clone()))
}

//------------------------------------------------------------//

type DilemmaInquiryMessageStuff = (serenity::CreateAttachment, Vec<serenity::CreateEmbed>);

async fn create_dilemma_inquiry_message_stuff(
    dilemma: &Dilemma,
) -> Result<DilemmaInquiryMessageStuff, Error> {
    let dilemma_html = generate_dilemma_html(&dilemma);

    let dilemma_png = html_to_png(dilemma_html).await?;

    let attachment_name = format!("dilemma_{}.png", dilemma.link);
    let attachment_url = format!("attachment://{}", attachment_name);
    let attachment = serenity::CreateAttachment::bytes(dilemma_png, attachment_name);

    let mut embeds = vec![];

    embeds.push(
        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .title(format!("Would you press the button? (#{})", dilemma.link))
        .image(attachment_url)
    );

    Ok((attachment, embeds))
}

type DilemmaResultsMessageStuff = Vec<serenity::CreateEmbed>;

async fn create_dilemma_results_message_stuff(
    dilemma: &Dilemma,
    initial_embeds: Vec<serenity::CreateEmbed>,
    user: serenity::UserId,
    user_agrees: bool,
) -> Result<DilemmaResultsMessageStuff, Error> {
    let mut embeds = initial_embeds;

    let yes_vote_num = dilemma.yes;
    let no_vote_num = dilemma.no;

    let total_votes = yes_vote_num + no_vote_num;
    let yes_vote_percent = (yes_vote_num as f32 / total_votes as f32 * 100.0).round();
    let no_vote_percent = (no_vote_num as f32 / total_votes as f32 * 100.0).round();

    let majority_agrees = yes_vote_num > no_vote_num;

    let embed_description = indoc::formatdoc!(
        r#"
            {user_mention}, it seems like the **majority of people {majority_opinion} with you**.

            You said **{choice}** and the majority of people said **{majority_choice}** too.

            **{yes_vote_num} ({yes_vote_percent}%)** people said **yes**!
            **{no_vote_num} ({no_vote_percent}%)** people said **no**!
        "#,
        user_mention = user.mention(),
        majority_opinion = if majority_agrees { "agree" } else { "disagree" },
        choice = if user_agrees { "yes" } else { "no" },
        majority_choice = if majority_agrees { "yes" } else { "no" },
        yes_vote_num = yes_vote_num,
        yes_vote_percent = yes_vote_percent,
        no_vote_num = no_vote_num,
        no_vote_percent = no_vote_percent,
    );

    embeds.push(
        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .description(embed_description)
    );

    Ok(embeds)
}

//------------------------------------------------------------//

/// Generates a random dilemma.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
    )
]
pub async fn would_you(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let yes_button_id = format!("{}-yes", ctx.id());
    let no_button_id = format!("{}-no", ctx.id());

    let yes_button =
        serenity::CreateButton::new(&yes_button_id)
        .style(serenity::ButtonStyle::Success)
        .label("Yes");

    let no_button =
        serenity::CreateButton::new(&no_button_id)
        .style(serenity::ButtonStyle::Danger)
        .label("No");

    let random_dilemma = fetch_random_dilemma().await?;

    let (attachment, initial_embeds) = create_dilemma_inquiry_message_stuff(&random_dilemma).await?;

    let mut create_reply =
        poise::CreateReply::default()
        .attachment(attachment.clone())
        .components(vec![
            serenity::CreateActionRow::Buttons(vec![
                yes_button.clone(),
                no_button.clone(),
            ])
        ]);

    for embed in &initial_embeds {
        create_reply = create_reply.embed(embed.clone());
    }

    let reply_handle = ctx.send(create_reply).await?;

    let message = reply_handle.message().await?;

    while let Some(component_interaction) =
        message
        .await_component_interactions(ctx)
        .author_id(ctx.author().id)
        .timeout(std::time::Duration::from_secs(5 * 60))
        .await
    {
        // Defer while we process the interaction.
        component_interaction.defer(ctx).await?;

        let component_interaction_id = component_interaction.data.custom_id.clone();

        let is_yes_button = component_interaction_id == yes_button_id;
        let is_no_button = component_interaction_id == no_button_id;

        if !is_yes_button && !is_no_button {
            continue; // Continue loop on unknown buttons.
        }

        let embeds = create_dilemma_results_message_stuff(
            &random_dilemma,
            initial_embeds.clone(),
            ctx.author().id,
            is_yes_button,
        ).await?;

        let edit_reply =
            serenity::EditInteractionResponse::default()
            .new_attachment(attachment)
            .add_embeds(embeds)
            .components(vec![
                serenity::CreateActionRow::Buttons(vec![
                    yes_button
                    .style(
                        if is_yes_button { serenity::ButtonStyle::Success }
                        else { serenity::ButtonStyle::Secondary }
                    )
                    .disabled(true),

                    no_button
                    .style(
                        if is_no_button { serenity::ButtonStyle::Danger }
                        else { serenity::ButtonStyle::Secondary }
                    )
                    .disabled(true),
                ])
            ]);

        component_interaction.edit_response(ctx, edit_reply).await?;

        break;
    }

    Ok(())
}
