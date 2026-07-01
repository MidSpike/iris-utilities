//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use itertools::Itertools;

use poise::serenity_prelude::{self as serenity};

use crate::Error;

//------------------------------------------------------------//

pub fn is_checking_enabled() -> bool {
    std::env::var("ENTITLEMENT_CHECKING_ENABLED")
    .expect("ENTITLEMENT_CHECKING_ENABLED environment variable is not set.")
    .parse::<bool>()
    .expect("ENTITLEMENT_CHECKING_ENABLED environment variable is not a valid boolean.")
}

//------------------------------------------------------------//

// TODO: This should probably be replaced with a system that checks a cache.
async fn _get_guild_active_valid_entitlements(
    http: impl serenity::CacheHttp,
    guild_id: serenity::GuildId,
) -> Result<Vec<serenity::Entitlement>, Error> {
    let guild_entitlements = http.http().get_entitlements(
        None, // user id
        None, // sku ids
        None, // before
        None, // after
        None, // limit
        Some(guild_id), // guild id
        Some(true) // exclude_ended
    ).await?;

    Ok(guild_entitlements)
}

// TODO: This should probably be replaced with a system that checks a cache.
async fn get_user_active_valid_entitlements(
    http: impl serenity::CacheHttp,
    user_id: serenity::UserId,
) -> Result<Vec<serenity::Entitlement>, Error> {
    let user_entitlements = http.http().get_entitlements(
        Some(user_id), // user id
        None, // sku ids
        None, // before
        None, // after
        None, // limit
        None, // guild id
        Some(true) // exclude_ended
    ).await?;

    Ok(user_entitlements)
}

// TODO: This should probably be replaced with a system that checks a cache.
async fn _get_guild_and_user_active_valid_entitlements(
    http: impl serenity::CacheHttp,
    guild_id: serenity::GuildId,
    user_id: serenity::UserId,
) -> Result<Vec<serenity::Entitlement>, Error> {
    let guild_entitlements = _get_guild_active_valid_entitlements(&http, guild_id).await?;
    let user_entitlements = get_user_active_valid_entitlements(&http, user_id).await?;

    let combined_entitlements =
        guild_entitlements.into_iter()
        .chain(user_entitlements.into_iter())
        .unique_by(|e| e.id)
        .collect();

    Ok(combined_entitlements)
}

//------------------------------------------------------------//

// TODO: Temporary, expected to be replaced or removed.
async fn _is_guild_entitled_anything(
    http: impl serenity::CacheHttp,
    guild_id: serenity::GuildId,
) -> Result<bool, Error> {
    let guild_entitlements = _get_guild_active_valid_entitlements(&http, guild_id).await?;

    Ok(!guild_entitlements.is_empty())
}

// TODO: Temporary, expected to be replaced or removed.
pub async fn is_user_entitled_anything(
    http: impl serenity::CacheHttp,
    user_id: serenity::UserId,
) -> Result<bool, Error> {
    let user_entitlements = get_user_active_valid_entitlements(&http, user_id).await?;

    Ok(!user_entitlements.is_empty())
}
