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

//------------------------------------------------------------//

/// Summon the bot to your voice channel.
#[
    poise::command(
        slash_command,
        guild_only,
        category = "Music",
    )
]
pub async fn summon(
    ctx: Context<'_>,
) -> Result<(), Error> {
    ctx.defer().await?;

    let Some(guild_id) = ctx.guild_id() else {
        ctx.say("This command can only be used in a server.").await?;

        return Ok(());
    };

    let mut guild_voice_states = HashMap::<poise::serenity_prelude::UserId, serenity::VoiceState>::new();
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
        ctx.say("Not in a voice channel").await?;

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
        music::JoinVoiceChannelResult::ConnectedToSameVoiceChannel |
        music::JoinVoiceChannelResult::ConnectedToNewVoiceChannel => {
            ctx.say(format!("Joined {}", user_voice_channel_id.mention())).await?;
        }
        music::JoinVoiceChannelResult::Failed(why) => {
            ctx.say(format!("Failed to join voice channel: {}", why)).await?;

            return Err(why);
        }
    }

    Ok(())
}

