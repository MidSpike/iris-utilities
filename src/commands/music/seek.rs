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

    let lava_client = ctx.data().lavalink.clone();

    let Some(player) = lava_client.get_player_context(guild_id.get()) else {
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
