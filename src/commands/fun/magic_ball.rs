//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use rand::prelude::SliceRandom;

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::brand::BrandColor;

use crate::common::helpers::bot::create_escaped_code_block;

//------------------------------------------------------------//

fn shake_magic_ball() -> String {
    let magic_ball_responses = [
        // Positive responses
        "Yes.",
        "Yes, definitely.",
        "Signs point to yes.",
        "It is certain.",
        "It is decidedly so.",
        "Without a doubt.",
        "You may rely on it.",
        "As I see it, yes.",
        "Most likely.",
        "Outlook good.",

        // Neutral responses
        "Better to not say now.",
        "Concentrate and ask again.",
        "Reply hazy, try again.",
        "Cannot predict now.",
        "Ask again later.",
        "Possibly.",
        "Maybe.",

        // Negative responses
        "No.",
        "No, definitely not.",
        "Outlook not so good.",
        "Don't count on it.",
        "My sources say no.",
        "Very doubtful.",
    ];

    magic_ball_responses
    .choose(&mut rand::thread_rng())
    .expect("Magic 8 ball responses vector is empty")
    .to_string()
}

//------------------------------------------------------------//

/// Ask the magic 8 ball a yes/no question.
#[
    poise::command(
        slash_command,
        category = "Fun",
    )
]
pub async fn magic_ball(
    ctx: Context<'_>,
    #[description = "The question to ask the magic 8 ball."] question: String,
) -> Result<(), Error> {
    ctx.defer().await?;

    let magic_ball_response = shake_magic_ball();

    ctx.send(
        poise::CreateReply::default().embed(
            serenity::CreateEmbed::default()
            .color(BrandColor::new().get())
            .thumbnail("https://cdn.midspike.com/projects/iris/magic-8-ball.webp")
            .title("Magic 8 Ball")
            .field(
                "You asked",
                create_escaped_code_block(None, &question),
                false,
            )
            .field(
                "The magic 8 ball says",
                create_escaped_code_block(None, &magic_ball_response),
                false,
            )
        )
    ).await?;

    Ok(())
}
