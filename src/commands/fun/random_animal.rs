//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

async fn fetch_random_fox_image_url() -> Result<String, Error> {
    let response = reqwest::get("https://randomfox.ca/floof/").await?;

    let json: serde_json::Value = response.json().await?;

    let image_url = json.get("image").expect("`image` was missing in response.");

    Ok(image_url.as_str().expect("`image` was not a string.").into())
}

async fn fetch_random_cat_image_url() -> Result<String, Error> {
    let response = reqwest::get("https://api.thecatapi.com/v1/images/search").await?;

    let json: serde_json::Value = response.json().await?;

    let first_image = json.get(0).expect("Index `0` was missing in response.");

    let image_url = first_image.get("url").expect("`[0].url` was missing in response.");

    Ok(image_url.as_str().expect("`url` was not a string.").into())
}

async fn fetch_random_dog_image_url() -> Result<String, Error> {
    let response = reqwest::get("https://dog.ceo/api/breeds/image/random").await?;

    let json: serde_json::Value = response.json().await?;

    let image_url = json.get("message").expect("`message` was missing in response.");

    Ok(image_url.as_str().expect("`message` was not a string.").into())
}

async fn fetch_random_bird_image_url() -> Result<String, Error> {
    let response = reqwest::get("https://shibe.online/api/birds").await?;

    let json: serde_json::Value = response.json().await?;

    let image_url = json.get(0).expect("Index `0` was missing in response.");

    Ok(image_url.as_str().expect("Index `0` was not a string.").into())
}

async fn fetch_random_panda_image_url() -> Result<String, Error> {
    let response = reqwest::get("https://some-random-api.ml/img/panda").await?;

    let json: serde_json::Value = response.json().await?;

    let image_url = json.get("link").expect("`link` was missing in response.");

    Ok(image_url.as_str().expect("`link` was not a string.").into())
}

//------------------------------------------------------------//

#[derive(poise::ChoiceParameter, derive_more::Display)]
enum AnimalKind {
    #[name = "Fox"]
    Fox,
    #[name = "Cat"]
    Cat,
    #[name = "Dog"]
    Dog,
    #[name = "Bird"]
    Bird,
    #[name = "Panda"]
    Panda,
}

impl AnimalKind {
    async fn fetch_random_image_url(&self) -> Result<String, Error> {
        match self {
            AnimalKind::Fox => fetch_random_fox_image_url().await,
            AnimalKind::Cat => fetch_random_cat_image_url().await,
            AnimalKind::Dog => fetch_random_dog_image_url().await,
            AnimalKind::Bird => fetch_random_bird_image_url().await,
            AnimalKind::Panda => fetch_random_panda_image_url().await,
        }
    }
}

//------------------------------------------------------------//

/// Fetches a random animal image from the internet.
#[
    poise::command(
        slash_command,
        category = "Fun",
        user_cooldown = "5", // in seconds
    )
]
pub async fn random_animal(
    ctx: Context<'_>,
    #[description = "The kind of animal to fetch"] kind: AnimalKind,
) -> Result<(), Error> {
    ctx.defer().await?;

    let Ok(image_url) = kind.fetch_random_image_url().await else {
        ctx.send(
            poise::CreateReply::default()
            .content("Failed to fetch a random animal image.")
        ).await?;

        return Ok(());
    };

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("Here's a random {}!", kind.to_string().to_lowercase()))
            .image(image_url)
        )
    ).await?;

    Ok(())
}
