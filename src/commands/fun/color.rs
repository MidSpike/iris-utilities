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

/// Displays a provided hex color.
#[
    poise::command(
        slash_command,
        category = "Fun",
        global_cooldown = "1", // in seconds
        user_cooldown = "3", // in seconds
    )
]
pub async fn color(
    ctx: Context<'_>,

    #[min_length = 6]
    #[max_length = 7]
    #[description = "The hex color to display"]
    color: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    let color = color.trim_start_matches('#');

    if color.len() != 6 {
        ctx.reply("Hex color must be 6 characters long").await?;

        return Ok(());
    }

    let parsed_color = match u32::from_str_radix(color, 16) {
        Ok(color) => color,
        Err(_) => {
            ctx.reply("Invalid hex color").await?;
            return Ok(());
        },
    };

    let r = (parsed_color >> 16) as u8;
    let g = (parsed_color >> 8) as u8;
    let b = parsed_color as u8;

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
            .color(parsed_color)
            .field("Decimal", format!("`{}`", parsed_color), true)
            .field("Hexadecimal", format!("`{}`", hex_color_string), true)
            .field("Rgb", format!("`{}, {}, {}`", r, g, b), true)
            .image(image_url)
        )
    ).await?;

    return Ok(());
}
