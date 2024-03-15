//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

use crate::common::brand::BrandColor;

use crate::Context;

//------------------------------------------------------------//

async fn get_user_feedback_telemetry_channel(
    ctx: &Context<'_>,
) -> Option<serenity::GuildChannel> {
    // We don't want to panic if the environment variable is not set.
    // And it is okay to not have a telemetry channel configured.
    let telemetry_channel_id = std::env::var("TELEMETRY_USER_FEEDBACK_CHANNEL_ID").ok();

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

pub async fn telemetry_user_feedback(
    ctx: &Context<'_>,
    user: &serenity::User,
    feedback: String,
) {
    let Some(telemetry_channel) = get_user_feedback_telemetry_channel(ctx).await else {
        return;
    };

    let embed_fields = [
        (
            "User",
            format!("@{} (`{}`)", user.name, user.id),
            false,
        ),
        (
            "Feedback",
            format!("```\n{}\n```", feedback),
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
