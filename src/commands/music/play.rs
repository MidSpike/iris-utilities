//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use std::collections::HashMap;

//------------------------------------------------------------//

use lavalink_rs::prelude::*;

use poise::serenity_prelude::{self as serenity};

use serenity::Mentionable;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::music;

//------------------------------------------------------------//

type GuildVoiceStates = HashMap::<poise::serenity_prelude::UserId, serenity::VoiceState>;

//------------------------------------------------------------//

pub async fn query_and_enqueue_track(
    ctx: Context<'_>,
    lava_client: &LavalinkClient,
    player_context: &PlayerContext,
    guild_id: serenity::GuildId,
    query: String,
) -> Result<(), Error> {
    let query =
        if query.starts_with("http:") { query }
        else if query.starts_with("https:") { query }
        else if query.starts_with("speak:") { query }
        else { SearchEngines::YouTube.to_query(&query)? };

    let loaded_tracks = match lava_client.load_tracks(guild_id.get(), &query).await {
        Ok(load_tracks) => load_tracks,
        Err(why) => {
            eprintln!("Failed to load tracks:\n{}", why);

            return Err("Failed to load tracks.".into());
        },
    };

    let queue_tracks: Vec<TrackInQueue> = match loaded_tracks.data {
        Some(TrackLoadData::Track(track)) => vec![track.into()],

        Some(TrackLoadData::Search(tracks)) => {
            match tracks.first() {
                Some(track) => vec![track.to_owned().into()],
                None => vec![],
            }
        },

        Some(TrackLoadData::Playlist(playlist)) => {
            ctx.say(format!("Added playlist to queue: {}", playlist.info.name)).await?;

            playlist.tracks.into_iter().map(|x| x.into()).collect()
        },

        Some(TrackLoadData::Error(why)) => {
            eprintln!("Failed to load tracks:\n{:?}", why);

            return Err("Failed to load tracks.".into());
        },

        None => {
            eprintln!("Loaded no tracks:\n{:?}", loaded_tracks);

            return Err("Loaded no tracks.".into());
        },
    };

    if queue_tracks.len() == 1 {
        // safe to unwrap since we checked the length
        let first_queue_track = queue_tracks.first().unwrap();

        let first_track = &first_queue_track.track;

        if let Some(uri) = &first_track.info.uri {
            ctx.say(
                format!(
                    "Added [{} - {}](<{}>) to the queue.",
                    first_track.info.author,
                    first_track.info.title,
                    uri
                )
            ).await?;
        } else {
            ctx.say(
                format!(
                    "Added {} - {} to the queue.",
                    first_track.info.author,
                    first_track.info.title
                )
            ).await?;
        }
    }

    let queue = player_context.get_queue();

    if let Err(why) = queue.append(queue_tracks.into()) {
        eprintln!("Failed to set queue:\n{}", why);

        return Err("Failed to set queue.".into());
    };

    let player = match player_context.get_player().await {
        Ok(player) => player,
        Err(why) => {
            eprintln!("Failed to get player:\n{}", why);

            return Err("Failed to get player.".into());
        },
    };

    let queue_is_empty = queue.get_count().await? == 0;

    // Sometimes the player does not automatically start playing.
    // This gives the player a little push to get it going.
    if player.track.is_none() && !queue_is_empty {
        player_context.skip()?;
    }

    let default_volume = music::Volume::from_normal_volume(music::NORMAL_VOLUME_DEFAULT);
    let maximum_volume = music::Volume::from_normal_volume(music::NORMAL_VOLUME_MAXIMUM);
    let current_volume = music::Volume::from_lavalink_volume(player.volume);

    // Use `get_lavalink_volume` since `get_normal_volume` performs conversions that are lossy.
    let volume_is_too_loud =
        current_volume.get_lavalink_volume() > maximum_volume.get_lavalink_volume();

    // Use the default volume if the current volume is too loud.
    // I wonder why lavalink's default is so high.
    if volume_is_too_loud {
        let set_volume_result =
            player_context.set_volume(default_volume.get_lavalink_volume()).await;

        if let Err(why) = set_volume_result {
            eprintln!("Failed to set volume:\n{}", why);

            return Err("Failed to set volume.".into());
        };
    }

    Ok(())
}

//------------------------------------------------------------//

/// Play music from a URL or search query.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
        user_cooldown = "3", // in seconds
    )
]
pub async fn play(
    ctx: Context<'_>,

    #[description = "Search query or url to play"]
    query: String,
) -> Result<(), Error> {
    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command can only be used in a server.").await?;

        return Ok(());
    };

    let mut guild_voice_states = GuildVoiceStates::new();
    if let Some(guild) = ctx.cache().guild(guild_id) {
        guild_voice_states = guild.voice_states.clone();
    }

    if guild_voice_states.is_empty() {
        ctx.say("No voice states found").await?;

        return Ok(());
    }

    let my_id = ctx.serenity_context().cache.current_user().id;

    let my_current_voice_channel_id_option =
        guild_voice_states
        .get(&my_id)
        .and_then(|voice_state| voice_state.channel_id);

    let user_voice_channel_id_option =
        guild_voice_states
        .get(&ctx.author().id)
        .and_then(|voice_state| voice_state.channel_id);

    let Some(user_voice_channel_id) = user_voice_channel_id_option else {
        ctx.say("You must be in a voice channel to use this command.").await?;

        return Ok(());
    };

    let lavalink_client = &ctx.data().lavalink;

    let songbird_manager = &songbird::get(ctx.serenity_context()).await.unwrap();

    let join_voice_channel_result = music::join_voice_channel(
        lavalink_client,
        songbird_manager,
        guild_id,
        my_current_voice_channel_id_option,
        user_voice_channel_id,
    ).await;

    match join_voice_channel_result {
        music::JoinVoiceChannelResult::ConnectedToSameVoiceChannel => {
            // say nothing since we're already connected to the voice channel
        },
        music::JoinVoiceChannelResult::ConnectedToNewVoiceChannel => {
            ctx.say(format!("Joined {}", user_voice_channel_id.mention())).await?;
        },
        music::JoinVoiceChannelResult::Failed(why) => {
            eprintln!("Failed to join voice channel:\n{}", why);

            return Err("Failed to join voice channel.".into());
        },
    }

    let lava_client = ctx.data().lavalink.clone();

    let Some(player_context) = lava_client.get_player_context(guild_id.get()) else {
        ctx.say("Join the bot to a voice channel first.").await?;

        return Ok(());
    };

    query_and_enqueue_track(
        ctx,
        &lava_client,
        &player_context,
        guild_id,
        query,
    ).await?;

    Ok(())
}
