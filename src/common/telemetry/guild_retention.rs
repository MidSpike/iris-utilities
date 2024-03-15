//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{FormattedTimestamp, FormattedTimestampStyle};
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

pub enum GuildRetentionTelemetryKind {
    BotAdded,
    BotRemoved,
}

//------------------------------------------------------------//

async fn get_guild_retention_telemetry_channel(
    ctx: &serenity::Context,
) -> Option<serenity::GuildChannel> {
    // We don't want to panic if the environment variable is not set.
    // And it is okay to not have a telemetry channel configured.
    let telemetry_channel_id = std::env::var("TELEMETRY_GUILD_RETENTION_CHANNEL_ID").ok();

    let Some(telemetry_channel_id) = telemetry_channel_id else {
        return None;
    };

    if telemetry_channel_id.is_empty() {
        return None;
    }

    let telemetry_channel_id =
        telemetry_channel_id.parse::<u64>()
        .expect("Failed to parse the telemetry channel id from the environment variable.");

    let telemetry_channel_id = serenity::ChannelId::new(telemetry_channel_id);

    let telemetry_channel = ctx.http.get_channel(telemetry_channel_id).await;

    let telemetry_channel = match telemetry_channel {
        Ok(t) => t,
        Err(why) => {
            println!("Failed to get the telemetry channel: {:?}", why);

            return None;
        },
    };

    let telemetry_channel = match telemetry_channel.guild() {
        Some(t) => t,
        None => {
            println!("The telemetry channel is not a guild channel.");

            return None;
        },
    };

    Some(telemetry_channel)
}

//------------------------------------------------------------//

fn create_guild_added_embed(
    guild: &serenity::Guild,
) -> serenity::CreateEmbed {
    let guild_id_string = guild.id.get().to_string();
    let guild_name = &guild.name;
    let guild_icon = guild.icon_url();

    let now = chrono::Utc::now();

    let now_timestamp =
        serenity::Timestamp::from_millis(now.timestamp_millis())
        .expect("Should not fail; failed to create timestamp from current time.");
    let now_timestamp_relative_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let now_timestamp_full_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let embed_fields = [
        (
            "Guild",
            format!("`{}`", guild_name),
            true,
        ),
        (
            "Snowflake",
            format!("`{}`", guild_id_string),
            true,
        ),
        (
            "Added On",
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

    if let Some(guild_icon) = guild_icon {
        embed = embed.thumbnail(guild_icon);
    }

    embed
}

fn create_guild_removed_embed(
    guild: &serenity::Guild,
) -> serenity::CreateEmbed {
    let guild_id_string = guild.id.get().to_string();
    let guild_name = &guild.name;
    let guild_icon = guild.icon_url();

    let now = chrono::Utc::now();

    let now_timestamp =
        serenity::Timestamp::from_millis(now.timestamp_millis())
        .expect("Should not fail; failed to create timestamp from current time.");
    let now_timestamp_relative_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::RelativeTime));
    let now_timestamp_full_format =
        FormattedTimestamp::new(now_timestamp, Some(FormattedTimestampStyle::LongDateTime));

    let embed_fields = [
        (
            "Guild",
            format!("`{}`", guild_name),
            true,
        ),
        (
            "Snowflake",
            format!("`{}`", guild_id_string),
            true,
        ),
        (
            "Removed On",
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

    if let Some(guild_icon) = guild_icon {
        embed = embed.thumbnail(guild_icon);
    }

    embed
}

//------------------------------------------------------------//

pub async fn telemetry_guild_retention(
    ctx: &serenity::Context,
    guild: &serenity::Guild,
    kind: GuildRetentionTelemetryKind,
) {
    let Some(telemetry_channel) = get_guild_retention_telemetry_channel(&ctx).await else {
        return;
    };

    let embed = match kind {
        GuildRetentionTelemetryKind::BotAdded => create_guild_added_embed(guild),
        GuildRetentionTelemetryKind::BotRemoved => create_guild_removed_embed(guild),
    };

    let message = serenity::CreateMessage::default().embed(embed);

    let result = telemetry_channel.send_message(ctx, message).await;

    if let Err(why) = result {
        println!("Failed to send the telemetry message: {:?}", why);
    }
}
