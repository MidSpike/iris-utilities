//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use poise::serenity_prelude::{self as serenity};

//------------------------------------------------------------//

use crate::Data;

use crate::Error;

use crate::events::handlers::guild_ai_chat_handler::guild_ai_chat_handler;

use crate::common::telemetry;

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
    _framework: poise::FrameworkContext<'_, Data, Error>,
    _data: &Data,
) -> Result<(), Error> {
    match event {
        serenity::FullEvent::Ready { data_about_bot } => {
            let my_name = &data_about_bot.user.name;
            let my_id = &data_about_bot.user.id;

            println!("Logged in as {} ({})", my_name, my_id);
        },

        serenity::FullEvent::InteractionCreate { interaction } => {
            match interaction {
                serenity::Interaction::Component(component_interaction) => {
                    component_interaction_handler(component_interaction).await?;
                },

                _ => {}, // ignore other types of interactions
            }
        },

        serenity::FullEvent::Message { new_message } => {
            // println!("{}: {}", new_message.author.name, new_message.content);

            guild_ai_chat_handler(ctx, new_message).await.expect("Failed to handle AI chat");
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
