//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity, Mentionable};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::branding;

use crate::common::helpers::bot::potential_nsfw_confirmation;

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

/// Fetches a random usually safe-for-work image of a furry.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "5", // in seconds
        install_context = "Guild|User",
        interaction_context = "Guild|BotDm|PrivateChannel",
    )
]
pub async fn random_furry(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let guild_channel = ctx.channel().await.map(|c| c.guild()).flatten();

    let is_nsfw_guild_channel = match guild_channel {
        Some(channel) => channel.nsfw,
        None => false, // if we can't determine if it's NSFW, assume it's not
    };

    if !is_nsfw_guild_channel && !potential_nsfw_confirmation(&ctx).await? {
        ctx.send(
            poise::CreateReply::default()
            .content(format!("Cancelled by {}.", ctx.author().mention()))
        ).await?;

        return Ok(());
    }

    let image_url: String = match fetch_random_furry_image_url().await {
        Ok(image_url) => image_url,
        Err(why) => {
            println!("Failed to fetch a random furry image: {:?}", why);

            ctx.send(
                poise::CreateReply::default()
                .content("Failed to fetch a random furry image.")
            ).await?;

            return Ok(());
        }
    };

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(branding::color::PRIMARY)
            .title(format!("Here's a random furry image!"))
            .image(image_url, None)
        )
    ).await?;

    Ok(())
}
