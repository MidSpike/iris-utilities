//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Skip the current song and play the next one.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
    )
]
pub async fn skip(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command can only be used in a server.").await?;

        return Ok(());
    };

    let lava_client = ctx.data().lavalink.clone();

    let Some(player) = lava_client.get_player_context(guild_id.get()) else {
        ctx.say("Have the bot join a voice channel first.").await?;

        return Ok(());
    };

    let now_playing = player.get_player().await?.track;

    if let Some(track) = now_playing {
        player.skip()?;

        let message = if let Some(uri) = &track.info.uri {
            format!(
                "Skipped [{} - {}](<{}>)",
                track.info.author,
                track.info.title,
                uri
            )
        } else {
            format!(
                "Skipped {} - {}",
                track.info.author,
                track.info.title
            )
        };

        ctx.say(message).await?;
    } else {
        ctx.say("Nothing to skip.").await?;
    }

    Ok(())
}
