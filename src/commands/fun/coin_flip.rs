//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use derive_more::Display;

use rand::Rng;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

#[derive(Display)]
enum CoinFlipToss {
    #[display("heads")]
    Heads,
    #[display("tails")]
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

    let toss = match rand::rng().random_bool(0.5) {
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
