//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

// use lavalink_rs::prelude::*;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Stops playback and clear the queue.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
        guild_cooldown = "3", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn stop(
    ctx: Context<'_>,
) -> Result<(), Error> {
    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command can only be used in a server.").await?;

        return Ok(());
    };

    let lava_client = ctx.data().lavalink.clone();

    let Some(player_context) = lava_client.get_player_context(guild_id.get()) else {
        ctx.say("Join the bot to a voice channel first.").await?;

        return Ok(());
    };

    let player = player_context.get_player().await?;

    if let Some(now_playing) = player.track {
        // stop the player
        player_context.stop_now().await?;

        // clear the queue
        player_context.get_queue().clear()?;

        ctx.say(format!("Stopped {}", now_playing.info.title)).await?;
    } else {
        ctx.say("Nothing to stop").await?;
    }

    Ok(())
}
