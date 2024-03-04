//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use std::collections::HashMap;

//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

use serenity::Mentionable;

//------------------------------------------------------------//

use crate::Context;

use crate::Error;

use crate::common::music;

use crate::commands::music::play::query_and_enqueue_track;

//------------------------------------------------------------//

type GuildVoiceStates = HashMap::<poise::serenity_prelude::UserId, serenity::VoiceState>;

//------------------------------------------------------------//

/// Text to speech.
#[
    poise::command(
        slash_command,
        category = "Utility",
    )
]
pub async fn text_to_speech(
    ctx: Context<'_>,
    #[description = "Text to speak"] text: String,
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
        }
        music::JoinVoiceChannelResult::ConnectedToNewVoiceChannel => {
            ctx.say(format!("Joined {}", user_voice_channel_id.mention())).await?;
        }
        music::JoinVoiceChannelResult::Failed(why) => {
            eprintln!("Failed to join voice channel:\n{}", why);

            return Err("Failed to join voice channel.".into());
        }
    }

    let lava_client = ctx.data().lavalink.clone();

    let Some(player_context) = lava_client.get_player_context(guild_id.get()) else {
        ctx.say("Join the bot to a voice channel first.").await?;

        return Ok(());
    };

    // Force the query to be treated as text to speech using the `speak:` prefix.
    let query = format!("speak: {}", text);

    query_and_enqueue_track(
        ctx,
        &lava_client,
        &player_context,
        guild_id,
        query,
    ).await?;

    Ok(())
}

