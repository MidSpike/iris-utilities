//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Seek to a specific point in the current song.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
        install_context = "Guild",
        interaction_context = "Guild",
        guild_cooldown = "3", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn seek(
    ctx: Context<'_>,

    #[min = 0]
    #[description = "Time to jump to (in seconds)"]
    to: u64,
) -> Result<(), Error> {
    ctx.defer().await?;

    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command can only be used in a server.").await?;

        return Ok(());
    };

    let lavalink_client = match &ctx.data().lavalink {
        Some(client) => client,
        None => {
            ctx.say("Lavalink client is not initialized.").await?;

            return Ok(());
        }
    };

    let Some(player) = lavalink_client.get_player_context(guild_id.get()) else {
        ctx.say("Join the bot to a voice channel first.").await?;

        return Ok(());
    };

    let now_playing = player.get_player().await?.track;

    if now_playing.is_some() {
        player.set_position(std::time::Duration::from_secs(to)).await?;

        ctx.say(format!("Jumped to {}s", to)).await?;
    } else {
        ctx.say("Nothing is playing").await?;
    }

    Ok(())
}
