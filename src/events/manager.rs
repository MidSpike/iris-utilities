//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

// use crate::Data;

use crate::Error;

use crate::common::telemetry;

use crate::events::handlers::guild_ai_chat_handler::guild_ai_chat_handler;

//------------------------------------------------------------//

async fn component_interaction_handler(
    _component_interaction: &serenity::ComponentInteraction,
) -> Result<(), Error> {
    Ok(())
}

//------------------------------------------------------------//

pub async fn event_handler(
    ctx: &serenity::Context,
    event: &serenity::FullEvent,
) -> Result<(), Error> {
    match event {
        serenity::FullEvent::Ready { data_about_bot } => {
            let my_name = &data_about_bot.user.name;
            let my_id = &data_about_bot.user.id;

            println!("Logged in as {} ({})", my_name, my_id);
        },

        serenity::FullEvent::InteractionCreate { interaction } => {
            if let serenity::Interaction::Component(component_interaction) = interaction {
                if let Err(why) = component_interaction_handler(component_interaction).await {
                    eprintln!("Error handling component interaction: {:?}", why);

                    return Ok(()); // Graceful
                }
            }
        },

        serenity::FullEvent::Message { new_message } => {
            if let Err(why) = guild_ai_chat_handler(&ctx, new_message).await {
                eprintln!("Error handling guild AI chat: {:?}", why);

                return Ok(()); // Graceful
            }
        },

        serenity::FullEvent::GuildCreate { guild, is_new } => {
            // assume that the guild is new
            let is_new = is_new.unwrap_or(true);

            if is_new {
                let kind = telemetry::guild_retention::GuildRetentionTelemetryKind::BotAdded;
                telemetry::guild_retention::telemetry_guild_retention(&ctx, &guild, kind).await;
            }
        },

        serenity::FullEvent::GuildDelete { incomplete: _, full: guild } => {
            if let Some(guild) = guild {
                let kind = telemetry::guild_retention::GuildRetentionTelemetryKind::BotRemoved;
                telemetry::guild_retention::telemetry_guild_retention(&ctx, &guild, kind).await;
            }
        },

        _ => {}, // ignore other events
    }

    Ok(())
}
