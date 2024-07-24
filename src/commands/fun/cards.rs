//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use regex::Regex;

use rand::prelude::SliceRandom;

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::chromium_oxide::{escape_html, html_to_png};

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Card {
    id: u32,
    card_type: String,
    text: String,
    num_answers: u32,
    expansion: String,
}

impl Card {
    fn get_formatted_text(
        &self
    ) -> Result<String, Error> {
        let re = Regex::new(r"[_]+")?;

        // replaces all underscore sequences with `_____`
        // don't escape underscores, as this wont be parsed as markdown
        let formatted_text = re.replace_all(&self.text, "_____");

        Ok(formatted_text.to_string())
    }
}

// async to future-proof
async fn fetch_cards() -> Result<Vec<Card>, Error> {
    let json_string = include_str!("../../extras/cards.json");

    let card = serde_json::from_str(json_string)?;

    Ok(card)
}

async fn fetch_random_question_card() -> Result<Option<Card>, Error> {
    let cards = fetch_cards().await?;

    let question_cards =
        cards
        .iter()
        .cloned()
        .filter(|card| card.card_type == "Q")
        .collect::<Vec<Card>>();

    let random_question_card =
        question_cards
        .choose(&mut rand::thread_rng())
        .map(|card| card.clone());

    Ok(random_question_card)
}

async fn fetch_random_answer_cards(
    question_card: &Card,
) -> Result<Vec<Card>, Error> {
    let cards = fetch_cards().await?;

    let answer_cards =
        cards
        .iter()
        .cloned()
        .filter(|card| card.card_type == "A")
        .collect::<Vec<Card>>();

    let random_answer_cards =
        answer_cards
        .choose_multiple(&mut rand::thread_rng(), question_card.num_answers as usize)
        .map(|card| card.clone())
        .collect::<Vec<Card>>();

    Ok(random_answer_cards)
}

//------------------------------------------------------------//

fn generate_question_card_html(
    card: &Card,
) -> Result<String, Error> {
    let formatted_card_text = card.get_formatted_text()?;
    let escaped_card_text = escape_html(formatted_card_text);

    Ok(
        include_str!("../../extras/html/fragment/question_card.html")
        .replace("{question_card_text}", &escaped_card_text)
    )
}

fn generate_answer_card_html(
    card: &Card,
) -> Result<String, Error> {
    let formatted_card_text = card.get_formatted_text()?;
    let escaped_card_text = escape_html(formatted_card_text);

    Ok(
        include_str!("../../extras/html/fragment/answer_card.html")
        .replace("{answer_card_text}", &escaped_card_text)
    )
}

fn generate_card_play_html(
    question_card: &Card,
    answer_cards: &Vec<Card>,
) -> Result<String, Error> {
    let question_card_html = generate_question_card_html(question_card)?;

    let mut answer_cards_html_strings = Vec::<String>::new();
    for answer_card in answer_cards {
        let answer_card_html = generate_answer_card_html(answer_card)?;
        answer_cards_html_strings.push(answer_card_html);
    }

    let answer_cards_html = answer_cards_html_strings.join("\n");


    Ok(
        include_str!("../../extras/html/pages/card_play.html")
        .replace("{question_card}", &question_card_html)
        .replace("{answer_cards}", &answer_cards_html)
    )
}

//------------------------------------------------------------//

/// Cards against ... something.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
    )
]
pub async fn cards(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let me = ctx.serenity_context().http.get_current_application_info().await?;

    let Some(random_question_card) = fetch_random_question_card().await? else {
        ctx.send(
            poise::CreateReply::default()
            .content("Failed to fetch random question card.")
        ).await?;

        return Ok(());
    };

    let random_answer_cards = fetch_random_answer_cards(&random_question_card).await?;

    let cards_play_html = generate_card_play_html(
        &random_question_card,
        &random_answer_cards,
    )?;

    let cards_play_png = html_to_png(cards_play_html).await?;

    let unix_epoch = chrono::Utc::now().timestamp();

    let attachment_name = format!("cards_{}.png", unix_epoch);
    let attachment_url = format!("attachment://{}", attachment_name);
    let attachment = serenity::CreateAttachment::bytes(cards_play_png, attachment_name);

    ctx.send(
        poise::CreateReply::default()
        .attachment(attachment)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("Cards Against {}", me.name))
            .image(attachment_url)
            .footer(serenity::CreateEmbedFooter::new("Inspired by Cards Against Humanity"))
        )
    ).await?;

    return Ok(());
}
