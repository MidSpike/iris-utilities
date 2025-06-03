//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use rand::Rng;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Rolls dice.
#[
    poise::command(
        slash_command,
        category = "Fun",
    )
]
pub async fn roll_dice(
    ctx: Context<'_>,

    #[min = 1]
    #[max = 1024]
    #[description = "The number of dice to roll"]
    amount: Option<u32>,

    #[min = 1]
    #[max = 1024]
    #[description = "The number of sides on each die"]
    sides: Option<u32>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let amount = amount.unwrap_or(1); // at least one die to roll
    if !(1..=1024).contains(&amount) {
        return Err("You must roll between 1 and 1024 dice".into());
    }

    let sides = sides.unwrap_or(6); // default to a six-sided die
    if !(1..=1024).contains(&sides) {
        return Err("Each die must have between 1 and 1024 sides".into());
    }

    let mut rolls = Vec::new();
    for _ in 0..amount {
        let roll = rand::rng().random_range(1..=sides);

        rolls.push(roll);
    }

    let combined_total: u32 = rolls.iter().sum();

    if amount == 1 {
        let content = format!(
            "You rolled a **{}** on your **{}-sided** die!",
            combined_total,
            sides,
        );

        ctx.send(
            poise::CreateReply::default().content(content)
        ).await?;
    } else {
        let formatted_rolls =
            rolls
            .iter()
            .map(|roll| format!("**{}**", roll))
            .collect::<Vec<String>>()
            .join(", ");

        let content = format!(
            "You rolled **{}**, **{}-sided** dice.\n{}\nThat gives you a total of **{}**!",
            amount,
            sides,
            formatted_rolls,
            combined_total,
        );

        ctx.send(
            poise::CreateReply::default().content(content)
        ).await?;
    }

    Ok(())
}
