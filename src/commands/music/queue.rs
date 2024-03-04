//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use lavalink_rs::prelude::*;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Clear the current queue.
#[poise::command(slash_command)]
pub async fn clear(
    ctx: Context<'_>,
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

    player.set_queue(QueueMessage::Clear)?;

    ctx.say("Queue cleared successfully").await?;

    Ok(())
}

/// View the current queue of music.
#[poise::command(slash_command)]
pub async fn items(
    ctx: Context<'_>,
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

    let queue = player.get_queue().await?;
    let player_data = player.get_player().await?;

    let max = queue.len().min(9);
    let queue_message = queue
        .range(0..max)
        .enumerate()
        .map(|(idx, x)| {
            if let Some(uri) = &x.track.info.uri {
                format!(
                    "{} -> [{} - {}](<{}>)",
                    idx + 1,
                    x.track.info.author,
                    x.track.info.title,
                    uri
                )
            } else {
                format!(
                    "{} -> {} - {}",
                    idx + 1,
                    x.track.info.author,
                    x.track.info.title
                )
            }
        })
        .join("\n");

    let queue_message =
        if queue_message.is_empty() { queue_message }
        else { format!("Up next:\n{}", queue_message) };

    let now_playing_message = if let Some(track) = player_data.track {
        if let Some(uri) = &track.info.uri {
            format!("Now playing: [{} - {}](<{}>)", track.info.author, track.info.title, uri)
        } else {
            format!("Now playing: {} - {}", track.info.author, track.info.title)
        }
    } else {
        "Now playing: nothing".to_string()
    };

    ctx.say(format!("{}\n\n{}", now_playing_message, queue_message)).await?;

    Ok(())
}

/// Remove a song from the queue.
#[poise::command(slash_command)]
pub async fn remove(
    ctx: Context<'_>,
    #[description = "Position of the song to remove (1-indexed)"] position: usize,
) -> Result<(), Error> {
    ctx.defer().await?;

    // convert to 0-indexed
    let index = position - 1;

    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command can only be used in a server.").await?;

        return Ok(());
    };

    let lava_client = ctx.data().lavalink.clone();

    let Some(player) = lava_client.get_player_context(guild_id.get()) else {
        ctx.say("Join the bot to a voice channel first.").await?;

        return Ok(());
    };

    let queue = player.get_queue().await?;

    if index > queue.len() {
        ctx.say("Position is larger than the queue length").await?;

        return Ok(());
    }

    let track = &queue[index - 1].track;

    if let Some(uri) = &track.info.uri {
        ctx.say(
            format!(
                "Removed from queue: [{} - {}](<{}>)",
                track.info.author,
                track.info.title,
                uri
            )
        ).await?;
    } else {
        ctx.say(
            format!(
                "Removed from queue: {} - {}",
                track.info.author,
                track.info.title
            )
        ).await?;
    }

    player.set_queue(QueueMessage::Remove(index))?;

    Ok(())
}

/// Control and view the current queue.
#[
    poise::command(
        slash_command,
        guild_only,
        subcommands("clear", "items", "remove"),
        category = "Music"
    )
]
pub async fn queue(
    _ctx: Context<'_>
) -> Result<(), Error> {
    Ok(())
}
