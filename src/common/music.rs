//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use std::sync::Arc;

//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Error;

//------------------------------------------------------------//

pub const LAVALINK_VOLUME_MULTIPLIER: u16 = 4; // DO NOT CHANGE THIS

pub const LAVALINK_VOLUME_MAXIMUM: u16 = 1000; // required by lavalink

pub const NORMAL_VOLUME_MAXIMUM: u16 = 100; // just so people don't go deaf

pub const NORMAL_VOLUME_DEFAULT: u16 = 50;

pub struct Volume(u16);

impl Volume {
    pub fn from_normal_volume(
        normal_volume: u16,
    ) -> Self {
        Self(normal_volume.min(NORMAL_VOLUME_MAXIMUM) / LAVALINK_VOLUME_MULTIPLIER)
    }

    pub fn from_lavalink_volume(
        lavalink_volume: u16,
    ) -> Self {
        Self(lavalink_volume.min(LAVALINK_VOLUME_MAXIMUM))
    }

    pub fn get_lavalink_volume(
        &self,
    ) -> u16 {
        self.0
    }

    /// Returns the volume in a more aesthetically pleasing way.
    ///
    /// Unfortunately, this is not a perfect conversion.
    /// Lavalink does not have support for floating point volume.
    /// So our scaled volume loses precision when converted.
    ///
    /// If `LAVALINK_VOLUME_MULTIPLIER` is ever changed, this function will need to be updated.
    pub fn get_normal_volume(
        &self,
    ) -> u16 {
        match self.0 * LAVALINK_VOLUME_MULTIPLIER {
            // raw volume -> aesthetic volume
            0 => 0,
            1..=8 => 10,
            9..=16 => 20,
            17..=32 => 30,
            33..=40 => 40,
            41..=52 => 50,
            53..=63 => 60,
            64..=72 => 70,
            73..=83 => 80,
            84..=92 => 90,
            93..=100 => 100,
            volume => volume.min(NORMAL_VOLUME_MAXIMUM),
        }
    }
}

//------------------------------------------------------------//

/// Silly wrapper to return proper types.
pub fn songbird_connection_info_to_lavalink_connection_info(
    connection_info: songbird::ConnectionInfo,
) -> lavalink_rs::model::player::ConnectionInfo {
    lavalink_rs::model::player::ConnectionInfo {
        session_id: connection_info.session_id,
        endpoint: connection_info.endpoint,
        token: connection_info.token,
    }
}

//------------------------------------------------------------//

pub enum JoinVoiceChannelResult {
    ConnectedToNewVoiceChannel,
    ConnectedToSameVoiceChannel,
    Failed(Error),
}

pub async fn join_voice_channel(
    lavalink_client: &lavalink_rs::prelude::LavalinkClient,
    songbird_manager: &Arc<songbird::Songbird>,
    guild_id: serenity::GuildId,
    old_voice_channel_id: Option<serenity::ChannelId>,
    new_voice_channel_id: serenity::ChannelId,
) -> JoinVoiceChannelResult {
    let (connection_info, _) =
    match
        songbird_manager.join_gateway(guild_id, new_voice_channel_id).await
    {
        Ok(connection_info) => connection_info,
        Err(why) => {
            return JoinVoiceChannelResult::Failed(why.into());
        }
    };

    let lavalink_connection_info =
        songbird_connection_info_to_lavalink_connection_info(connection_info);

    let lavalink_player_context_result =
        lavalink_client.create_player_context(guild_id.get(), lavalink_connection_info).await;

    match lavalink_player_context_result {
        Ok(_) => {
            if let Some(old_voice_channel_id) = old_voice_channel_id {
                if old_voice_channel_id == new_voice_channel_id {
                    return JoinVoiceChannelResult::ConnectedToSameVoiceChannel;
                }
            }

            JoinVoiceChannelResult::ConnectedToNewVoiceChannel
        },
        Err(why) => {
            JoinVoiceChannelResult::Failed(why.into())
        }
    }
}
