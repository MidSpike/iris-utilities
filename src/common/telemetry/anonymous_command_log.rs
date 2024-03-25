//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{FormattedTimestamp, FormattedTimestampStyle};
use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Context;

use crate::common::brand::BrandColor;

//------------------------------------------------------------//

async fn get_anonymous_command_log_telemetry_channel(
    ctx: &Context<'_>,
) -> Option<serenity::GuildChannel> {
    // We don't want to panic if the environment variable is not set.
    // And it is okay to not have a telemetry channel configured.
    let telemetry_channel_id = std::env::var("TELEMETRY_ANONYMOUS_COMMAND_LOG_CHANNEL_ID").ok();

    let Some(telemetry_channel_id) = telemetry_channel_id else {
        return None;
    };

    if telemetry_channel_id.is_empty() {
        return None;
    }

    let telemetry_channel_id =
        telemetry_channel_id.parse::<u64>()
        .expect("Failed to parse the telemetry channel id from the environment variable.",);

    let telemetry_channel_id = serenity::ChannelId::new(telemetry_channel_id);

    let telemetry_channel = ctx.http().get_channel(telemetry_channel_id).await;

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

pub async fn telemetry_anonymous_command_log(
    ctx: &Context<'_>,
    command: String,
) {
    let Some(telemetry_channel) = get_anonymous_command_log_telemetry_channel(ctx).await else {
        return;
    };

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
            "Executed On",
            format!("{} ({})", now_timestamp_full_format, now_timestamp_relative_format),
            false,
        ),
        (
            "Command Run",
            format!("```\n{}\n```", command),
            false,
        ),
    ];

    let embed =
        serenity::CreateEmbed::default()
        .color(BrandColor::new().get())
        .fields(embed_fields);

    let message = serenity::CreateMessage::default().embed(embed);

    let result = telemetry_channel.send_message(ctx, message).await;

    if let Err(why) = result {
        println!("Failed to send the telemetry message: {:?}", why);
    }
}
