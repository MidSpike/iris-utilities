//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::telemetry;

//------------------------------------------------------------//

/// Send feedback to this bot's developers.
#[
    poise::command(
        slash_command,
        category = "Help and Info",
        user_cooldown = "60", // in seconds
    )
]
pub async fn feedback(
    ctx: Context<'_>,

    #[min_length = 16]
    #[max_length = 2048]
    #[description = "What do you want to tell the developers?"]
    feedback: String,
) -> Result<(), Error> {
    let user = &ctx.interaction.user;

    telemetry::user_feedback::telemetry_user_feedback(&ctx, user, feedback).await;

    Ok(())
}
