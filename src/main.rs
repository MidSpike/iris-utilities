//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

#![allow(clippy::needless_return)]
#![allow(clippy::println_empty_string)]
#![allow(clippy::redundant_field_names)]

//------------------------------------------------------------//

use std::sync::Arc;

use anyhow::{Context as AnyhowContext, Result};

use lavalink_rs::prelude::*;

use poise::serenity_prelude::{self as serenity, ActivityData as SerenityActivityData, ApplicationId};

//------------------------------------------------------------//

pub mod commands;

pub mod common;

pub mod events;

use crate::commands::create_commands;

use crate::common::helpers::{libre_translate, bot::create_default_allowed_mentions};

use crate::events::manager::EventHandler;

use crate::common::telemetry::anonymous_command_log::telemetry_anonymous_command_log;

//------------------------------------------------------------//

pub struct Data {
    pub songbird_manager: Arc<songbird::Songbird>,
    pub lavalink: Option<LavalinkClient>,
    pub libre_translate_supported_languages: Vec<libre_translate::LibreTranslateLanguage>,
}

pub type Error = Box<dyn std::error::Error + Send + Sync>;

// pub type Context<'a> = poise::Context<'a, Data, Error>;
pub type Context<'a> = poise::ApplicationContext<'a, Data, Error>;

//------------------------------------------------------------//

async fn create_client_builder() -> serenity::ClientBuilder {
    let framework_options = poise::FrameworkOptions {
        allowed_mentions: Some(create_default_allowed_mentions()),
        commands: create_commands(),
        pre_command: |context| {
            // This will run before every command invocation
            Box::pin(async move {
                if let poise::Context::Application(ctx) = context {
                    telemetry_anonymous_command_log(&ctx).await;
                }
            })
        },
        ..poise::FrameworkOptions::default()
    };

    let framework =
        poise::Framework::builder()
        .options(framework_options)
        .build();

    let discord_id: ApplicationId =
        std::env::var("DISCORD_ID")
        .expect("Environment variable DISCORD_ID not set")
        .parse::<u64>()
        .expect("Environment variable DISCORD_ID is not a valid u64")
        .into();

    let discord_token = serenity::Token::from_env("DISCORD_TOKEN").expect("Environment variable DISCORD_TOKEN not set");

    let gateway_intents =
        // serenity::GatewayIntents::non_privileged() |
        serenity::GatewayIntents::GUILDS |
        serenity::GatewayIntents::GUILD_MESSAGES |
        serenity::GatewayIntents::DIRECT_MESSAGES |
        serenity::GatewayIntents::GUILD_MESSAGE_REACTIONS |
        serenity::GatewayIntents::GUILD_VOICE_STATES |
        serenity::GatewayIntents::GUILD_MEMBERS | // privileged intent
        serenity::GatewayIntents::MESSAGE_CONTENT; // privileged intent

    let mut client_builder =
        serenity::ClientBuilder::new(discord_token, gateway_intents)
        .activity(SerenityActivityData::custom("Chilling with slash commands!"))
        .event_handler(Arc::new(EventHandler::new()))
        .framework(Box::new(framework));

    let decode_mode = songbird::driver::DecodeMode::Decode(
        songbird::driver::DecodeConfig::default()
    );

    let songbird_config =
        songbird::Config::default()
        .decode_mode(decode_mode); // audio receiving mode

    let voice_manager = songbird::Songbird::serenity_from_config(songbird_config);

    let data: Data = {
        let lavalink_client: Option<LavalinkClient> = {
            let lavalink_rs_hostname =
                std::env::var("LAVALINK_HOSTNAME")
                .expect("Environment variable LAVALINK_HOSTNAME not set");

            let lavalink_rs_password =
                std::env::var("LAVALINK_PASSWORD")
                .expect("Environment variable LAVALINK_PASSWORD not set");

            let lavalink_rs_node = NodeBuilder {
                hostname: lavalink_rs_hostname,
                password: lavalink_rs_password,
                user_id: lavalink_rs::model::UserId(discord_id.get()),
                ..Default::default()
            };

            let lavalink_rs_client = LavalinkClient::new(
                lavalink_rs::model::events::Events::default(),
                vec![lavalink_rs_node],
                NodeDistributionStrategy::default(),
            ).await;

            Some(lavalink_rs_client)
        };

        let supported_libre_langs = match libre_translate::fetch_supported_languages().await {
            Ok(langs) => langs,
            Err(why) => {
                eprintln!("Failed to fetch supported languages from LibreTranslate: {why:?}");

                Vec::new()
            },
        };

        Data {
            songbird_manager: Arc::clone(&voice_manager),
            lavalink: lavalink_client,
            libre_translate_supported_languages: supported_libre_langs,
        }
    };

    client_builder =
        client_builder
        .voice_manager(voice_manager)
        .data(Arc::new(data));

    client_builder
}

//------------------------------------------------------------//

async fn perform_basic_runtime_tests() {
    common::database::adapter::test().await
    .expect("Failed to test database connection");
}

//------------------------------------------------------------//

#[tokio::main]
async fn main() -> Result<()> {
    // We need to specify a default cryptography provider for Rustls.
    // Otherwise, Rustls will panic that it could not default at runtime.
    // Rustls is required by some dependencies, such as `reqwest`.
    rustls::crypto::ring::default_provider().install_default()
    .expect("Failed to set default rustls cryptography provider");

    // Initialize tracing subscriber to catch logs from serenity/poise and other libraries.
    tracing_subscriber::fmt::init();

    perform_basic_runtime_tests().await;

    let client_builder = create_client_builder().await;

    let mut client = client_builder.await.context("Failed to create discord client")?;

    let shard_count = client.http.get_bot_gateway().await.context("Failed to get bot gateway")?.shards.get();

    client.start_shards(shard_count).await.context("Failed to start discord client")?;

    Ok(())
}
