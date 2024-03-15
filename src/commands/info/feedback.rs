//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::common::telemetry;

use crate::Context;
use crate::Error;

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
    feedback: String,
) -> Result<(), Error> {
    let user = &ctx.interaction.user;

    telemetry::user_feedback::telemetry_user_feedback(&ctx, user, feedback).await;

    Ok(())
}
