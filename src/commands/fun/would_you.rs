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

use crate::common::helpers::html_rendering::{escape_html, html_to_png};

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

    let user_agent = std::env::var("USER_AGENT").expect("Missing `USER_AGENT` in environment.");

    let response =
        reqwest_client
        .get("https://v4.willyoupressthebutton.com/api/dilemma/random")
        .header(reqwest::header::USER_AGENT, user_agent) // api is picky about having a user agent
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await?;

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

async fn create_dilemma_results_message_stuff(
    dilemma: &Dilemma,
    user: serenity::UserId,
    user_agrees: bool,
) -> Result<serenity::CreateEmbed, Error> {
    let yes_vote_num = dilemma.yes;
    let no_vote_num = dilemma.no;

    let total_votes = yes_vote_num + no_vote_num;
    let yes_vote_percent = (yes_vote_num as f32 / total_votes as f32 * 100.0).round();
    let no_vote_percent = (no_vote_num as f32 / total_votes as f32 * 100.0).round();

    let majority_said_yes = yes_vote_num > no_vote_num;
    let mutual_consensus = user_agrees == majority_said_yes;

    let embed_description = indoc::formatdoc!(
        r#"
            {user_mention}, {response_joke}

            **{yes_vote_num} ({yes_vote_percent}%)** people said **yes**!
            **{no_vote_num} ({no_vote_percent}%)** people said **no**!
        "#,
        user_mention = user.mention(),
        response_joke = if mutual_consensus {
            "it seems like great minds think alike!"
        } else {
            "so this is a bit awkward..."
        },
        yes_vote_num = yes_vote_num,
        yes_vote_percent = yes_vote_percent,
        no_vote_num = no_vote_num,
        no_vote_percent = no_vote_percent,
    );

    Ok(
        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .description(embed_description)
    )
}

//------------------------------------------------------------//

/// Generates a random dilemma.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
        install_context = "Guild|User",
        interaction_context = "Guild|BotDm|PrivateChannel",
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

        let result_embed = create_dilemma_results_message_stuff(
            &random_dilemma,
            ctx.author().id,
            is_yes_button,
        ).await?;

        let edit_reply =
            serenity::EditInteractionResponse::default()
            .new_attachment(attachment)
            .add_embeds(initial_embeds)
            .add_embed(result_embed)
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
