//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use lavalink_rs::model::player::Filters;
use lavalink_rs::model::player::Karaoke;
use lavalink_rs::model::player::Timescale;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

//------------------------------------------------------------//

/// Applies filters to the currently playing track.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
        guild_cooldown = "3", // in seconds
        user_cooldown = "5", // in seconds
    )
]
pub async fn filters(
    ctx: Context<'_>,

    #[min = 0.0]
    #[max = 2.0]
    #[description = "Pitch alteration (0.0 to 2.0, default is 1.0)"]
    pitch: Option<f64>,

    #[min = 0.0]
    #[max = 1.0]
    #[description = "Karaoke effect amount (0.0 to 1.0, default is 0.0)"]
    karaoke: Option<f64>,

    #[min = 0.0]
    #[max = 200.0]
    #[description = "Volume adjustment (0.0 to 200.0, default is 100.0)"]
    volume: Option<f64>,
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

    let Some(player_context) = lavalink_client.get_player_context(guild_id.get()) else {
        ctx.say("Have the bot join a voice channel first.").await?;

        return Ok(());
    };

    let pitch = pitch.unwrap_or(1.0).clamp(0.0, 2.0);

    let karaoke = karaoke.unwrap_or(0.0).clamp(0.0, 1.0);

    let volume = volume.unwrap_or(100.0).clamp(0.0, 200.0) / 100.0; // Scale to 0.0 - 2.0 for lavalink

    let result = player_context.set_filters(
        Filters {
            timescale: Some(
                Timescale {
                    pitch: Some(pitch),
                    ..Default::default()
                }
            ),
            karaoke: Some(
                Karaoke {
                    level: Some(karaoke),
                    ..Default::default()
                }
            ),
            volume: Some(volume),
            ..Default::default()
        }
    ).await;

    if let Err(why) = result {
        ctx.say(format!("Failed to apply filters: {}", why)).await?;

        return Err("Failed to apply filters".into());
    }

    ctx.say("Applied filters to the currently playing track.").await?;

    Ok(())
}
