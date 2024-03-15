//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::common::brand::BrandColor;
use crate::Context;
use crate::Error;

//------------------------------------------------------------//

async fn fetch_random_furry_image_url() -> Result<String, Error> {
    let reqwest_client = reqwest::Client::new();

    let user_agent = std::env::var("USER_AGENT").expect("Missing `USER_AGENT` in environment.");

    let response =
        reqwest_client
        .get("https://v2.yiff.rest/furry/fursuit")
        .header(reqwest::header::USER_AGENT, user_agent) // api is picky about having a user agent
        .send()
        .await?;

    let json: serde_json::Value = response.json().await?;

    let images = json.get("images").expect("`images` was missing in response.");

    let first_image = images.get(0).expect("Index `0` was missing in response.");

    let image_url = first_image.get("url").expect("`images[0].url` was missing in response.");

    Ok(image_url.as_str().expect("`images[0].url` was not a string.").into())
}

//------------------------------------------------------------//

/// Fetches a random safe-for-work image of a furry.
#[
    poise::command(
        slash_command,
        category = "Fun",
        user_cooldown = "5", // in seconds
    )
]
pub async fn random_furry(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let image_url = match fetch_random_furry_image_url().await {
        Ok(image_url) => image_url,
        Err(why) => {
            println!("Failed to fetch a furry image: {:?}", why);

            ctx.send(
                poise::CreateReply::default()
                .content("Failed to fetch a furry image.")
            ).await?;

            return Ok(());
        }
    };

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(format!("Here's a random furry image!"))
            .image(image_url)
        )
    ).await?;

    Ok(())
}
