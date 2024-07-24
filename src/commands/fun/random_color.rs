//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use std::io::Cursor;

//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Generate and display a random color.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
    )
]
pub async fn random_color(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let r = rand::random::<u8>();
    let g = rand::random::<u8>();
    let b = rand::random::<u8>();

    // 0xRRGGBB
    // Bitwise OR (retain ones) from left to right.
    let rgb = (r as u32) << 16 | (g as u32) << 8 | (b as u32);

    let hex_color_string = format!("#{:02X}{:02X}{:02X}", r, g, b);

    let image_name = String::from("random_color.png");
    let image_url = format!("attachment://{}", image_name);
    let image = image::ImageBuffer::from_pixel(1920, 1080, image::Rgb([r, g, b]));

    let mut image_bytes: Vec<u8> = Vec::new();
    image.write_to(&mut Cursor::new(&mut image_bytes), image::ImageFormat::Png)?;

    let attachment = serenity::CreateAttachment::bytes(image_bytes, image_name);

    ctx.send(
        poise::CreateReply::default()
        .attachment(attachment)
        .embed(
            serenity::CreateEmbed::default()
            .color(rgb)
            .field("Decimal", format!("`{}`", rgb), true)
            .field("Hexadecimal", format!("`{}`", hex_color_string), true)
            .field("Rgb", format!("`{}, {}, {}`", r, g, b), true)
            .image(image_url)
        )
    ).await?;

    return Ok(());
}
