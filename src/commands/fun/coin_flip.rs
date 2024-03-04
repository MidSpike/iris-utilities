//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use derive_more::Display;

use rand::Rng;

// use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;
use crate::Error;

//------------------------------------------------------------//

#[derive(Display)]
enum CoinFlipToss {
    #[display(fmt = "heads")]
    Heads,
    #[display(fmt = "tails")]
    Tails,
}

//------------------------------------------------------------//

/// Flips a coin.
#[
    poise::command(
        slash_command,
        category = "Fun",
    )
]
pub async fn coin_flip(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let toss = match rand::thread_rng().gen_bool(0.5) {
        true => CoinFlipToss::Heads,
        false => CoinFlipToss::Tails,
    };

    ctx.send(
        poise::CreateReply::default().content(
            format!("You flipped a coin, it landed on **{}**!", toss)
        )
    ).await?;

    Ok(())
}
