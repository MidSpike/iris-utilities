//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use serde::{Deserialize, Serialize};

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::brand::BrandEmojis;

use crate::common::helpers::chromium_oxide::{escape_html, html_to_png};

//------------------------------------------------------------//

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Poll {
    title: String,
    description: String,
    options: Vec<String>,
}

//------------------------------------------------------------//

fn generate_poll_option_html(
    poll_option: &String,
) -> Result<String, Error> {
    let escaped_poll_option_html = escape_html(poll_option.clone());

    Ok(
        include_str!("../../extras/html/fragment/poll_option.html")
        .replace("{poll_option_text}", &escaped_poll_option_html)
    )
}

fn generate_poll_html(
    poll: &Poll,
) -> Result<String, Error> {
    let mut poll_options_html_strings = Vec::new();

    for poll_option_index in 0..poll.options.len() {
        let poll_option_text =
            format!("{} - {}", poll_option_index, &poll.options[poll_option_index]);

        let escaped_poll_option_html = generate_poll_option_html(&poll_option_text)?;

        poll_options_html_strings.push(escaped_poll_option_html);
    }

    let poll_options_html = poll_options_html_strings.join("\n");

    Ok(
        include_str!("../../extras/html/pages/poll.html")
        .replace("{poll_options}", &poll_options_html)
    )
}

//------------------------------------------------------------//

/// Create a poll with random cards.
#[
    poise::command(
        slash_command,
        category = "Fun",
        user_cooldown = "5", // in seconds
    )
]
pub async fn poll(
    ctx: Context<'_>,
    #[description = "What is the short title of this poll?"] title: String,
    #[description = "What is the long description of this poll?"] description: String,
    #[description = "What is option #0?"] option_0: String,
    #[description = "What is option #1?"] option_1: String,
    #[description = "What is option #2?"] option_2: Option<String>,
    #[description = "What is option #3?"] option_3: Option<String>,
    #[description = "What is option #4?"] option_4: Option<String>,
    #[description = "What is option #5?"] option_5: Option<String>,
    #[description = "What is option #6?"] option_6: Option<String>,
    #[description = "What is option #7?"] option_7: Option<String>,
    #[description = "What is option #8?"] option_8: Option<String>,
    #[description = "What is option #9?"] option_9: Option<String>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let maybe_options: Vec<Option<String>> = vec![
        Some(option_0),
        Some(option_1),
        option_2,
        option_3,
        option_4,
        option_5,
        option_6,
        option_7,
        option_8,
        option_9,
    ];

    let options = maybe_options.into_iter().filter_map(|option| option).collect();

    let poll = Poll {
        title,
        description,
        options,
    };

    let poll_html = generate_poll_html(&poll)?;

    let png_bytes = html_to_png(poll_html).await?;

    let unix_epoch = chrono::Utc::now().timestamp();

    let attachment_name = format!("poll_{}.png", unix_epoch);
    let attachment_url = format!("attachment://{}", attachment_name);
    let attachment = serenity::CreateAttachment::bytes(png_bytes, attachment_name);

    let footer_text = format!("Poll started by {}", ctx.author().name);
    let footer_icon = ctx.author().face();
    let footer = serenity::CreateEmbedFooter::new(footer_text).icon_url(footer_icon);

    let reply_handle = ctx.send(
        poise::CreateReply::default()
        .attachment(attachment)
        .embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .title(poll.title)
            .description(poll.description)
            .image(attachment_url)
            .footer(footer)
        )
    ).await?;

    let poll_message = reply_handle.message().await?;

    let reactions = vec![
        BrandEmojis::NumberZero,
        BrandEmojis::NumberOne,
        BrandEmojis::NumberTwo,
        BrandEmojis::NumberThree,
        BrandEmojis::NumberFour,
        BrandEmojis::NumberFive,
        BrandEmojis::NumberSix,
        BrandEmojis::NumberSeven,
        BrandEmojis::NumberEight,
        BrandEmojis::NumberNine,
    ];

    for reaction in reactions {
        let reaction = reaction.get();

        poll_message.react(
            ctx,
            serenity::ReactionType::Custom {
                id: serenity::EmojiId::new(reaction.id()),
                name: Some(reaction.name().to_string()),
                animated: false,
            },
        ).await?;

        // throttle the reaction rate to avoid rate limits imposed by Discord
        tokio::time::sleep(std::time::Duration::from_millis(250)).await;
    }

    return Ok(());
}
