//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{
    self as serenity,
    CacheHttp,
    FormattedTimestamp,
    FormattedTimestampStyle,
    GenericChannelId
};

//------------------------------------------------------------//

// use crate::Data;

use crate::Error;

use crate::common::database::interfaces::guild_config::GuildConfig;

//------------------------------------------------------------//

async fn get_guild_logging_channel(
    ctx: &serenity::Context,
    guild_id: &serenity::GuildId,
    channel_id: &GenericChannelId,
) -> Result<Option<serenity::GuildChannel>, Error> {
    let generic_channel_result = channel_id.to_channel(&ctx.http(), Some(*guild_id)).await;

    let guild_channel = match generic_channel_result {
        Ok(channel) => Some(channel.guild().expect("channel should be a guild channel")),
        Err(_) => None,
    };

    Ok(guild_channel)
}

//------------------------------------------------------------//

fn create_member_join_embed(
    user: &serenity::User,
) -> serenity::CreateEmbed<'_> {
    let user_id_string = &user.id.to_string();
    let user_name = &user.name;
    let user_avatar_url = user.avatar_url();

    let now = chrono::Utc::now();

    let now_timestamp =
        serenity::Timestamp::from_millis(now.timestamp_millis())
        .expect("Should not fail; failed to create timestamp from current time.");
    let now_timestamp_relative_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let now_timestamp_full_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::FullDateShortTime));

    let embed_fields = [
        (
            "Member",
            format!("`{}`", user_name),
            true,
        ),
        (
            "Snowflake",
            format!("`{}`", user_id_string),
            true,
        ),
        (
            "Joined On",
            format!(
                "{} ({})",
                now_timestamp_full_format,
                now_timestamp_relative_format
            ),
            false,
        ),
    ];

    let mut embed =
        serenity::CreateEmbed::default()
        .color(0x00FF00)
        .fields(embed_fields);

    if let Some(member_avatar_url) = user_avatar_url {
        embed = embed.thumbnail(member_avatar_url, None);
    }

    embed
}

fn create_member_leave_embed(
    user: &serenity::User,
) -> serenity::CreateEmbed<'_> {
    let user_id_string = &user.id.to_string();
    let user_name = &user.name;
    let user_avatar_url = user.avatar_url();

    let now = chrono::Utc::now();

    let now_timestamp =
        serenity::Timestamp::from_millis(now.timestamp_millis())
        .expect("Should not fail; failed to create timestamp from current time.");
    let now_timestamp_relative_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let now_timestamp_full_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::FullDateShortTime));

    let embed_fields = [
        (
            "Member",
            format!("`{}`", user_name),
            true,
        ),
        (
            "Snowflake",
            format!("`{}`", user_id_string),
            true,
        ),
        (
            "Left On",
            format!(
                "{} ({})",
                now_timestamp_full_format,
                now_timestamp_relative_format
            ),
            false,
        ),
    ];

    let mut embed =
        serenity::CreateEmbed::default()
        .color(0xFFFF00)
        .fields(embed_fields);

    if let Some(member_avatar_url) = user_avatar_url {
        embed = embed.thumbnail(member_avatar_url, None);
    }

    embed
}

//------------------------------------------------------------//

pub async fn guild_logging_channels_member_join_handler(
    ctx: &serenity::Context,
    new_member: &serenity::Member,
) -> Result<(), Error> {
    let guild_id = new_member.guild_id;

    let guild_config = GuildConfig::ensure(guild_id).await?;

    let Some(logging_channel_id) = guild_config.get_logging_channels().await.guild_member_join else {
        return Ok(()); // Graceful
    };

    let logging_channel = match get_guild_logging_channel(&ctx, &guild_id, &logging_channel_id).await? {
        Some(channel) => channel,
        None => {
            eprintln!("[Ignorable] Logging channel not found for guild: {}", guild_id);

            // TODO: Consider removing the logging channel from the guild config if it no longer exists.

            return Ok(()); // Graceful
        }
    };

    let embed = create_member_join_embed(&new_member.user);

    let message = serenity::CreateMessage::default().embed(embed);

    logging_channel.send_message(&ctx.http(), message).await?;

    Ok(())
}

pub async fn guild_logging_channels_member_leave_handler(
    ctx: &serenity::Context,
    guild_id: serenity::GuildId,
    user: &serenity::User,
) -> Result<(), Error> {
    let guild_config = GuildConfig::ensure(guild_id).await?;

    let Some(logging_channel_id) = guild_config.get_logging_channels().await.guild_member_leave else {
        return Ok(()); // Graceful
    };

    let logging_channel = match get_guild_logging_channel(&ctx, &guild_id, &logging_channel_id).await? {
        Some(channel) => channel,
        None => {
            eprintln!("[Ignorable] Logging channel not found for guild: {}", guild_id);

            // TODO: Consider removing the logging channel from the guild config if it no longer exists.

            return Ok(()); // Graceful
        }
    };

    let embed = create_member_leave_embed(&user);

    let message = serenity::CreateMessage::default().embed(embed);

    logging_channel.send_message(&ctx.http(), message).await?;

    Ok(())
}
