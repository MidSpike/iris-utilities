//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// See this bot's ping.
#[
    poise::command(
        slash_command,
        category = "Help and Info",
        install_context = "Guild|User",
        interaction_context = "Guild|BotDm|PrivateChannel",
    )
]
pub async fn ping(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let ping_duration = ctx.ping().await;

    match ping_duration {
        std::time::Duration::ZERO => {
            ctx.reply(
                "Average ping has not been calculated yet. Please try again in a few seconds..."
            ).await?;
        }
        _ => {
            ctx.reply(format!("Pong! {}ms", ping_duration.as_millis())).await?;
        }
    }

    Ok(())
}
