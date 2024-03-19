//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

fn get_unicode_character_info(
    character: char,
) -> String {
    let character_string = character.to_string();

    let character_number = character as u64; // safe since rust char always occupies 4 bytes

    format!(
        "`{}` - `{}`",
        format!("\\u{{{:08}}}", character_number),
        character_string,
    )
}

//------------------------------------------------------------//

/// Displays information about a given character.
#[
    poise::command(
        slash_command,
        category = "Utility",
    )
]
pub async fn unicode_info(
    ctx: Context<'_>,

    #[min_length = 1]
    #[max_length = 16]
    #[description = "The unicode to get information about"]
    unicode: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    let characters = unicode.chars();

    let info =
        characters
        .take(16) // limit user input to 16 characters to prevent giant embeds
        .map(|c| get_unicode_character_info(c))
        .join("\n");

    ctx.send(
        poise::CreateReply::default()
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title("Unicode Information")
            .description(
                format!(
                    "```{}```\n{}",
                    unicode,
                    info,
                )
            )
        )
    ).await?;

    return Ok(());
}
